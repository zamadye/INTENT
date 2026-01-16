import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.44.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMITS: Record<string, { requests: number; windowSeconds: number }> = {
  'siwe-auth': { requests: 10, windowSeconds: 3600 }, // 10/hour
  'campaign-create': { requests: 20, windowSeconds: 3600 }, // 20/hour
  'campaign-save': { requests: 30, windowSeconds: 3600 }, // 30/hour
  'verify-action': { requests: 50, windowSeconds: 3600 }, // 50/hour (RPC calls)
  'artifact-generate': { requests: 10, windowSeconds: 3600 }, // 10/hour (expensive)
  'proof-record': { requests: 100, windowSeconds: 3600 }, // 100/hour
  'proof-mint': { requests: 50, windowSeconds: 3600 }, // 50/hour
};

// Generic error helper - logs details server-side, returns safe message to client
function safeError(status: number, publicMsg: string, internalDetails?: unknown): Response {
  if (internalDetails) console.error('[AuthService] Internal:', internalDetails);
  return new Response(JSON.stringify({ error: publicMsg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

interface SiwePayload {
  message: string;
  signature: string;
  address: string;
}

// Rate limiting helper - uses in-memory for simplicity
const userRateLimits = new Map<string, { count: number; windowStart: number }>();

function checkUserRateLimitInMemory(
  userId: string,
  endpoint: string,
  limit: { requests: number; windowSeconds: number }
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const windowStart = Math.floor(now / (limit.windowSeconds * 1000)) * (limit.windowSeconds * 1000);
  const key = `${endpoint}:${userId}:${windowStart}`;
  const resetAt = new Date(windowStart + limit.windowSeconds * 1000);
  
  // Clean old entries periodically
  if (Math.random() < 0.01) {
    const cutoff = now - limit.windowSeconds * 1000 * 2;
    for (const [k, v] of userRateLimits.entries()) {
      if (v.windowStart < cutoff) {
        userRateLimits.delete(k);
      }
    }
  }
  
  const existing = userRateLimits.get(key);
  
  if (existing) {
    if (existing.count >= limit.requests) {
      return { allowed: false, remaining: 0, resetAt };
    }
    existing.count++;
    return { allowed: true, remaining: limit.requests - existing.count, resetAt };
  } else {
    userRateLimits.set(key, { count: 1, windowStart });
    return { allowed: true, remaining: limit.requests - 1, resetAt };
  }
}

// IP-based rate limiting for unauthenticated endpoints
const ipRateLimits = new Map<string, { count: number; windowStart: number }>();

function checkIpRateLimitInMemory(
  ipAddress: string,
  endpoint: string,
  limit: { requests: number; windowSeconds: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / (limit.windowSeconds * 1000)) * (limit.windowSeconds * 1000);
  const key = `${endpoint}:${ipAddress}:${windowStart}`;
  
  // Clean old entries periodically (every ~1% of requests)
  if (Math.random() < 0.01) {
    const cutoff = now - limit.windowSeconds * 1000 * 2;
    for (const [k, v] of ipRateLimits.entries()) {
      if (v.windowStart < cutoff) {
        ipRateLimits.delete(k);
      }
    }
  }
  
  const existing = ipRateLimits.get(key);
  
  if (existing) {
    if (existing.count >= limit.requests) {
      return { allowed: false, remaining: 0 };
    }
    existing.count++;
    return { allowed: true, remaining: limit.requests - existing.count };
  } else {
    ipRateLimits.set(key, { count: 1, windowStart });
    return { allowed: true, remaining: limit.requests - 1 };
  }
}

// SIWE verification helper with nonce tracking to prevent replay attacks
async function verifySiweSignature(
  siwe: SiwePayload,
  supabase: SupabaseClient
): Promise<{ valid: boolean; error?: string; address?: string }> {
  try {
    // Parse the SIWE message to extract the address
    const addressMatch = siwe.message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return { valid: false, error: 'Invalid SIWE message format' };
    }
    
    const messageAddress = addressMatch[0].toLowerCase();
    if (messageAddress !== siwe.address.toLowerCase()) {
      return { valid: false, error: 'Address mismatch in SIWE message' };
    }

    // Check expiration if present
    const expirationMatch = siwe.message.match(/Expiration Time: (.+)/);
    if (expirationMatch) {
      const expirationTime = new Date(expirationMatch[1]);
      if (expirationTime < new Date()) {
        return { valid: false, error: 'SIWE message expired' };
      }
    }

    // Extract and validate nonce - CRITICAL for replay attack prevention
    const nonceMatch = siwe.message.match(/Nonce: ([a-zA-Z0-9_-]+)/);
    if (!nonceMatch) {
      console.warn('[SIWE] Missing nonce in message');
      return { valid: false, error: 'Missing nonce in SIWE message' };
    }
    const nonce = nonceMatch[1];
    
    // Validate nonce format (basic sanity check)
    if (nonce.length < 8 || nonce.length > 64) {
      return { valid: false, error: 'Invalid nonce format' };
    }

    // Check if nonce has already been used (replay attack prevention)
    // Using explicit type casting to avoid TypeScript issues with new tables
    const { data: usedNonce, error: nonceCheckError } = await (supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: { nonce: string } | null; error: unknown }>
          }
        }
      }
    }).from('siwe_nonces')
      .select('nonce')
      .eq('nonce', nonce)
      .maybeSingle();
    
    if (nonceCheckError) {
      console.error('[SIWE] Nonce check error:', nonceCheckError);
      // Don't fail hard on db errors, but log for monitoring
    }

    if (usedNonce) {
      console.warn('[SIWE] Replay attack prevented - nonce already used:', nonce);
      return { valid: false, error: 'Nonce already used - replay attack prevented' };
    }

    // Verify the signature using viem
    const isValid = await verifyMessage({
      address: siwe.address as `0x${string}`,
      message: siwe.message,
      signature: siwe.signature as `0x${string}`,
    });

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Store the used nonce to prevent replay attacks
    // Nonce expires after 2 hours (beyond the SIWE message expiration)
    const { error: nonceInsertError } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (val: Record<string, unknown>) => Promise<{ error: unknown }>
      }
    }).from('siwe_nonces')
      .insert({
        nonce,
        wallet_address: siwe.address.toLowerCase(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      });
    
    if (nonceInsertError) {
      console.error('[SIWE] Failed to store nonce:', nonceInsertError);
      // If we can't store the nonce, reject to be safe (prevents replay if DB write fails)
      return { valid: false, error: 'Failed to record authentication - please try again' };
    }

    console.log('[SIWE] Nonce validated and stored:', nonce);
    return { valid: true, address: siwe.address.toLowerCase() };
  } catch (error) {
    console.error('[SIWE] Verification error:', error);
    return { valid: false, error: 'Signature verification failed' };
  }
}

// Cleanup expired nonces - called periodically
async function cleanupExpiredNonces(supabase: SupabaseClient): Promise<number> {
  try {
    const { data, error } = await (supabase as unknown as {
      from: (table: string) => {
        delete: () => {
          lt: (col: string, val: string) => {
            select: (cols: string) => Promise<{ data: { nonce: string }[] | null; error: unknown }>
          }
        }
      }
    }).from('siwe_nonces')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('nonce');
    
    if (error) {
      console.error('[SIWE] Nonce cleanup error:', error);
      return 0;
    }
    
    const deletedCount = data?.length || 0;
    if (deletedCount > 0) {
      console.log(`[SIWE] Cleaned up ${deletedCount} expired nonces`);
    }
    return deletedCount;
  } catch (err) {
    console.error('[SIWE] Nonce cleanup failed:', err);
    return 0;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1] || 'default';

    // Get client IP for rate limiting (unauthenticated endpoints)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log(`[AuthService] Action: ${action}, Method: ${req.method}`);

    // Periodically clean up expired nonces (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupExpiredNonces(supabase).catch(err => 
        console.error('[AuthService] Background nonce cleanup failed:', err)
      );
    }

    switch (action) {
      case 'siwe-auth': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Rate limiting for SIWE auth (IP-based since user isn't authenticated yet)
        const rateLimit = checkIpRateLimitInMemory(clientIp, 'siwe-auth', RATE_LIMITS['siwe-auth']);
        if (!rateLimit.allowed) {
          console.warn(`[AuthService] Rate limit exceeded for IP: ${clientIp.slice(0, 10)}...`);
          return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
            status: 429,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': '3600'
            },
          });
        }

        const body = await req.json();
        const { message, signature, address } = body as SiwePayload;

        if (!message || !signature || !address) {
          return new Response(JSON.stringify({ error: 'Missing SIWE data' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify SIWE signature with nonce tracking
        const siweResult = await verifySiweSignature({ message, signature, address }, supabase);
        if (!siweResult.valid) {
          return safeError(401, 'Authentication failed', `SIWE verification failed: ${siweResult.error}`);
        }

        const walletAddress = siweResult.address!;
        const email = `${walletAddress}@wallet.local`;

        console.log(`[AuthService] SIWE verified for wallet: ${walletAddress}`);

        // Check if user exists in auth.users
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          u => u.email === email || u.user_metadata?.wallet_address === walletAddress
        );

        // Helper function to generate password using per-user salt from secure table
        const generatePassword = async (userSalt: string): Promise<string> => {
          const STATIC_SALT = 'arc_intent_protocol_v1_2026';
          const encoder = new TextEncoder();
          const keyMaterial = encoder.encode(
            `${walletAddress}:${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}:${STATIC_SALT}:${userSalt}:siwe_auth`
          );
          const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };

        // Generate cryptographically random salt for new users
        const generateRandomSalt = (): string => {
          const saltBytes = new Uint8Array(16);
          crypto.getRandomValues(saltBytes);
          return Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        };

        let userId: string;
        let session: { access_token: string; refresh_token: string } | null = null;

        if (existingUser) {
          // User exists - get their auth_salt from the SECURE profiles_auth_secrets table
          console.log(`[AuthService] Existing user found: ${existingUser.id}`);
          
          // Fetch existing auth_salt from the secure secrets table (service_role only)
          const { data: existingSecret } = await (supabase as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  maybeSingle: () => Promise<{ data: { auth_salt: string } | null; error: unknown }>
                }
              }
            }
          }).from('profiles_auth_secrets')
            .select('auth_salt')
            .eq('user_id', existingUser.id)
            .maybeSingle();
          
          // Use existing salt or generate new one if missing (migration case)
          let userSalt = existingSecret?.auth_salt;
          if (!userSalt) {
            userSalt = generateRandomSalt();
            // Store the new salt in the secure table
            await (supabase as unknown as {
              from: (table: string) => {
                upsert: (val: Record<string, unknown>) => Promise<unknown>
              }
            }).from('profiles_auth_secrets')
              .upsert({ 
                user_id: existingUser.id, 
                auth_salt: userSalt 
              });
          }
          
          const password = await generatePassword(userSalt);
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // If password changed or something wrong, try to update it
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password }
            );
            
            if (updateError) {
              return safeError(401, 'Authentication failed', updateError);
            }

            // Try sign in again
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (retryError) {
              return safeError(401, 'Authentication failed', retryError);
            }

            session = retryData.session;
            userId = existingUser.id;
          } else {
            session = signInData.session;
            userId = existingUser.id;
          }
        } else {
          // New user - create account with random salt
          console.log(`[AuthService] Creating new user for wallet: ${walletAddress}`);
          
          // Generate unique salt for this user
          const userSalt = generateRandomSalt();
          const password = await generatePassword(userSalt);

          const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm since SIWE verified ownership
            user_metadata: {
              wallet_address: walletAddress,
              auth_method: 'siwe',
            },
          });

          if (signUpError) {
            return safeError(500, 'Failed to create account', signUpError);
          }

          userId = signUpData.user.id;

          // Sign in to get session
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            return safeError(500, 'Authentication failed', signInError);
          }

          session = signInData.session;

          // Store auth_salt in the SECURE profiles_auth_secrets table
          try {
            await (supabase as unknown as {
              from: (table: string) => {
                insert: (val: Record<string, unknown>) => Promise<{ error: unknown }>
              }
            }).from('profiles_auth_secrets')
              .insert({
                user_id: userId,
                auth_salt: userSalt,
              });
          } catch (secretError) {
            console.error('[AuthService] Auth secret storage error (non-fatal):', secretError);
          }

          // Create profile for new user (WITHOUT auth_salt - it's in the secure table now)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              wallet_address: walletAddress,
              username: null,
              campaigns_created: 0,
              nfts_minted: 0,
            });

          if (profileError) {
            console.error('[AuthService] Profile creation error (non-fatal):', profileError);
            // Non-fatal - user can still use the app
          } else {
            console.log('[AuthService] Profile created successfully');
          }
        }

        console.log(`[AuthService] Authentication successful for user: ${userId}`);

        return new Response(JSON.stringify({
          success: true,
          user: {
            id: userId,
            wallet_address: walletAddress,
          },
          session: session ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          } : null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'profile': {
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const walletAddress = url.searchParams.get('wallet');
        
        if (!walletAddress) {
          return new Response(JSON.stringify({ error: 'Wallet address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Explicit field selection for profile retrieval (no auth_salt - it's in secure table)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, wallet_address, username, campaigns_created, nfts_minted, created_at, updated_at')
          .eq('wallet_address', walletAddress.toLowerCase())
          .maybeSingle();

        if (error) {
          return safeError(500, 'Internal error', error);
        }

        return new Response(JSON.stringify({ profile }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update-profile': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { walletAddress, username, siwe } = body;

        if (!walletAddress || !siwe) {
          return new Response(JSON.stringify({ error: 'Wallet address and SIWE required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify SIWE with nonce tracking
        const siweResult = await verifySiweSignature({
          message: siwe.message,
          signature: siwe.signature,
          address: walletAddress,
        }, supabase);

        if (!siweResult.valid) {
          return safeError(401, 'Authentication failed', `SIWE verification failed: ${siweResult.error}`);
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ username })
          .eq('wallet_address', walletAddress.toLowerCase())
          .select()
          .single();

        if (error) {
          return safeError(500, 'Failed to update profile', error);
        }

        return new Response(JSON.stringify({ success: true, profile }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    return safeError(500, 'Internal error', error);
  }
});

// Export rate limiting utilities for use by other edge functions
export { checkUserRateLimitInMemory, checkIpRateLimitInMemory, RATE_LIMITS };
