import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.44.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SiwePayload {
  message: string;
  signature: string;
  address: string;
}

// SIWE verification helper
async function verifySiweSignature(
  siwe: SiwePayload
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

    // Verify the signature using viem
    const isValid = await verifyMessage({
      address: siwe.address as `0x${string}`,
      message: siwe.message,
      signature: siwe.signature as `0x${string}`,
    });

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, address: siwe.address.toLowerCase() };
  } catch (error) {
    console.error('[SIWE] Verification error:', error);
    return { valid: false, error: 'Signature verification failed' };
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

    console.log(`[AuthService] Action: ${action}, Method: ${req.method}`);

    switch (action) {
      case 'siwe-auth': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

        // Verify SIWE signature
        const siweResult = await verifySiweSignature({ message, signature, address });
        if (!siweResult.valid) {
          console.warn(`[AuthService] SIWE verification failed: ${siweResult.error}`);
          return new Response(JSON.stringify({ error: `Authentication failed: ${siweResult.error}` }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const walletAddress = siweResult.address!;
        const email = `${walletAddress}@wallet.local`;

        console.log(`[AuthService] SIWE verified for wallet: ${walletAddress}`);

        // Check if user exists in auth.users
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          u => u.email === email || u.user_metadata?.wallet_address === walletAddress
        );

        // Helper function to generate password using per-user salt
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
          // User exists - get their auth_salt from profile and sign in
          console.log(`[AuthService] Existing user found: ${existingUser.id}`);
          
          // Fetch existing auth_salt from profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('auth_salt')
            .eq('wallet_address', walletAddress)
            .maybeSingle();
          
          // Use existing salt or generate new one if missing (migration case)
          let userSalt = existingProfile?.auth_salt;
          if (!userSalt) {
            userSalt = generateRandomSalt();
            // Store the new salt
            await supabase
              .from('profiles')
              .update({ auth_salt: userSalt })
              .eq('wallet_address', walletAddress);
          }
          
          const password = await generatePassword(userSalt);
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            console.error(`[AuthService] Sign-in error:`, signInError);
            // If password changed or something wrong, try to update it
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password }
            );
            
            if (updateError) {
              console.error(`[AuthService] Failed to update password:`, updateError);
              return new Response(JSON.stringify({ error: 'Authentication failed' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            // Try sign in again
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (retryError) {
              console.error(`[AuthService] Retry sign-in failed:`, retryError);
              return new Response(JSON.stringify({ error: 'Authentication failed' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
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
            console.error(`[AuthService] Sign-up error:`, signUpError);
            return new Response(JSON.stringify({ error: 'Failed to create account' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          userId = signUpData.user.id;

          // Sign in to get session
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            console.error(`[AuthService] Post-signup sign-in error:`, signInError);
            return new Response(JSON.stringify({ error: 'Failed to authenticate' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          session = signInData.session;

          // Create profile for new user with auth_salt
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              wallet_address: walletAddress,
              username: null,
              campaigns_created: 0,
              nfts_minted: 0,
              auth_salt: userSalt,
            });

          if (profileError) {
            console.error(`[AuthService] Profile creation error:`, profileError);
            // Non-fatal - user can still use the app
          } else {
            console.log(`[AuthService] Profile created for user: ${userId}`);
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

        // Explicit field selection for profile retrieval (exclude user_id from public response)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, wallet_address, username, campaigns_created, nfts_minted, created_at, updated_at')
          .eq('wallet_address', walletAddress.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error(`[AuthService] Profile fetch error:`, error);
          throw error;
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

        // Verify SIWE
        const siweResult = await verifySiweSignature({
          message: siwe.message,
          signature: siwe.signature,
          address: walletAddress,
        });

        if (!siweResult.valid) {
          return new Response(JSON.stringify({ error: `Authentication failed: ${siweResult.error}` }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .update({ username })
          .eq('wallet_address', walletAddress.toLowerCase())
          .select()
          .single();

        if (error) {
          console.error(`[AuthService] Profile update error:`, error);
          throw error;
        }

        return new Response(JSON.stringify({ success: true, profile }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({
          error: 'Unknown action',
          availableActions: ['siwe-auth', 'profile', 'update-profile'],
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error: unknown) {
    console.error('[AuthService] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});