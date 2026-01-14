import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.44.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Campaign State Machine
enum CampaignState {
  DRAFT = 'draft',
  GENERATED = 'generated',
  FINALIZED = 'finalized',
  SHARED = 'shared'
}

// Intent Categories (on-chain enum mapping)
enum IntentCategory {
  Builder = 0,
  DeFi = 1,
  Social = 2,
  Infrastructure = 3
}

interface CampaignIntent {
  category: IntentCategory;
  targetDApps: string[];
  actionOrder: string[];
  timeWindow: 'none' | '24h' | '1week' | '1month';
}

interface SiwePayload {
  message: string;
  signature: string;
}

// Validation helpers
function isStateTransitionValid(from: CampaignState, to: CampaignState): boolean {
  const validTransitions: Record<CampaignState, CampaignState[]> = {
    [CampaignState.DRAFT]: [CampaignState.GENERATED],
    [CampaignState.GENERATED]: [CampaignState.FINALIZED, CampaignState.DRAFT],
    [CampaignState.FINALIZED]: [CampaignState.SHARED],
    [CampaignState.SHARED]: []
  };
  return validTransitions[from]?.includes(to) ?? false;
}

function generateIntentFingerprint(intent: CampaignIntent): string {
  const data = JSON.stringify({
    category: intent.category,
    dapps: [...intent.targetDApps].sort(),
    actions: intent.actionOrder,
    timeWindow: intent.timeWindow
  });
  
  // Simple hash for fingerprint
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

// SIWE verification helper
async function verifySiweSignature(
  siwe: SiwePayload,
  expectedAddress: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Parse the SIWE message to extract the address
    const addressMatch = siwe.message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return { valid: false, error: 'Invalid SIWE message format' };
    }
    
    const messageAddress = addressMatch[0].toLowerCase();
    if (messageAddress !== expectedAddress.toLowerCase()) {
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
      address: expectedAddress as `0x${string}`,
      message: siwe.message,
      signature: siwe.signature as `0x${string}`,
    });

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1] || 'default';
    const authHeader = req.headers.get('Authorization');

    console.log(`[CampaignService] Action: ${action}, Method: ${req.method}`);

    // Route handling
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Require JWT authentication for campaign creation
        if (!authHeader?.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create an authenticated client to verify JWT
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
        
        if (claimsError || !claimsData?.user) {
          console.warn('[CampaignService] Invalid JWT:', claimsError?.message);
          return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userId = claimsData.user.id;
        console.log(`[CampaignService] Authenticated user: ${userId}`);

        const body = await req.json();
        const { walletAddress, campaignType, arcContext, tones, customInput, imageStyle, intent } = body;

        if (!walletAddress) {
          return new Response(JSON.stringify({ error: 'Wallet address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate wallet address format (basic Ethereum address validation)
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          return new Response(JSON.stringify({ error: 'Invalid wallet address format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Verify wallet ownership - user's profile wallet must match request wallet
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError || !profile) {
          return new Response(JSON.stringify({ error: 'Profile not found. Please authenticate first.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (profile.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[CampaignService] Wallet mismatch: ${walletAddress} != ${profile.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: Wallet address does not match your profile' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate intent fingerprint if intent provided
        const fingerprint = intent ? generateIntentFingerprint(intent) : null;

        const { data: campaign, error } = await supabase
          .from('campaigns')
          .insert({
            wallet_address: walletAddress.toLowerCase(), // Normalize to lowercase
            user_id: userId, // Always set from authenticated JWT
            campaign_type: campaignType || 'general',
            arc_context: arcContext || [],
            tones: tones || [],
            custom_input: customInput || null,
            image_style: imageStyle || 'default',
            status: CampaignState.DRAFT,
            caption: '',
            caption_hash: '',
          })
          .select()
          .single();

        if (error) {
          console.error('[CampaignService] Create error:', error);
          throw error;
        }

        console.log(`[CampaignService] Created campaign: ${campaign.id} for user: ${userId}`);

        return new Response(JSON.stringify({ 
          success: true, 
          campaign,
          fingerprint 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'transition': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { campaignId, fromState, toState, walletAddress, siwe } = body;

        if (!campaignId || !fromState || !toState || !walletAddress) {
          return new Response(JSON.stringify({ error: 'Missing required fields (campaignId, fromState, toState, walletAddress)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SIWE verification for state transitions (optional but recommended for sensitive operations)
        if (siwe) {
          const siweResult = await verifySiweSignature(siwe, walletAddress);
          if (!siweResult.valid) {
            console.warn(`[CampaignService] SIWE verification failed: ${siweResult.error}`);
            return new Response(JSON.stringify({ error: `Authentication failed: ${siweResult.error}` }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.log(`[CampaignService] SIWE verified for wallet: ${walletAddress}`);
        }

        // Validate state transition
        if (!isStateTransitionValid(fromState as CampaignState, toState as CampaignState)) {
          return new Response(JSON.stringify({ 
            error: `Invalid state transition: ${fromState} -> ${toState}` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current campaign state (explicit field selection for transition)
        const { data: currentCampaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('id, wallet_address, status')
          .eq('id', campaignId)
          .single();

        if (fetchError || !currentCampaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Verify ownership - only campaign owner can transition state
        if (currentCampaign.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[CampaignService] Ownership check failed: ${walletAddress} != ${currentCampaign.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: You do not own this campaign' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (currentCampaign.status !== fromState) {
          return new Response(JSON.stringify({ 
            error: `Campaign is in ${currentCampaign.status} state, not ${fromState}` 
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update state
        const { data: updatedCampaign, error: updateError } = await supabase
          .from('campaigns')
          .update({ status: toState })
          .eq('id', campaignId)
          .select()
          .single();

        if (updateError) {
          console.error('[CampaignService] Transition error:', updateError);
          throw updateError;
        }

        console.log(`[CampaignService] Transitioned campaign ${campaignId}: ${fromState} -> ${toState}`);

        return new Response(JSON.stringify({ 
          success: true, 
          campaign: updatedCampaign 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get': {
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const campaignId = url.searchParams.get('id');
        const walletAddress = url.searchParams.get('wallet');
        const authHeader = req.headers.get('Authorization');

        if (campaignId) {
          // Single campaign access - check auth first
          if (authHeader) {
            // Authenticated request - can see own campaigns of any state
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            
            if (!authError && user) {
              // Get campaign with ownership check (full fields for owner)
              const { data: campaign, error } = await supabase
                .from('campaigns')
                .select('id, user_id, wallet_address, caption, image_url, caption_hash, image_style, campaign_type, tones, arc_context, custom_input, status, image_status, image_prompt, generation_metadata, created_at, updated_at')
                .eq('id', campaignId)
                .maybeSingle();

              if (error) throw error;

              // If user owns this campaign, return full data
              if (campaign && campaign.user_id === user.id) {
                return new Response(JSON.stringify({ campaign }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }

          // Unauthenticated or non-owner: only allow finalized/shared campaigns (public fields only)
          const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('id, caption, image_url, caption_hash, image_style, campaign_type, status, created_at')
            .eq('id', campaignId)
            .in('status', ['finalized', 'shared'])
            .maybeSingle();

          if (error) throw error;

          if (!campaign) {
            return new Response(JSON.stringify({ error: 'Campaign not found or not publicly accessible' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Query already uses explicit field selection - return directly (no manual filtering needed)
          return new Response(JSON.stringify({ campaign }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (walletAddress) {
          // Bulk wallet queries REQUIRE authentication for security
          if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authentication required for wallet queries' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: authError } = await supabase.auth.getUser(token);

          if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Verify wallet ownership via profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('wallet_address')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (profile.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
            return new Response(JSON.stringify({ error: 'Unauthorized: You can only view your own campaigns' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // User verified - return all their campaigns including drafts (full fields for owner)
          const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('id, user_id, wallet_address, caption, image_url, caption_hash, image_style, campaign_type, tones, arc_context, custom_input, status, image_status, image_prompt, generation_metadata, created_at, updated_at')
            .eq('wallet_address', walletAddress.toLowerCase())
            .order('created_at', { ascending: false });

          if (error) throw error;

          return new Response(JSON.stringify({ campaigns }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ error: 'Campaign ID or wallet address required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: ['create', 'transition', 'get']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error: unknown) {
    console.error('[CampaignService] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
