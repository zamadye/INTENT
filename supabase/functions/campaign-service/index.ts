import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1] || 'default';

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

        // Generate intent fingerprint if intent provided
        const fingerprint = intent ? generateIntentFingerprint(intent) : null;

        const { data: campaign, error } = await supabase
          .from('campaigns')
          .insert({
            wallet_address: walletAddress.toLowerCase(), // Normalize to lowercase
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

        console.log(`[CampaignService] Created campaign: ${campaign.id}`);

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
        const { campaignId, fromState, toState, walletAddress } = body;

        if (!campaignId || !fromState || !toState || !walletAddress) {
          return new Response(JSON.stringify({ error: 'Missing required fields (campaignId, fromState, toState, walletAddress)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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

        // Get current campaign state
        const { data: currentCampaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
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

        if (campaignId) {
          const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .maybeSingle();

          if (error) throw error;

          return new Response(JSON.stringify({ campaign }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (walletAddress) {
          const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('wallet_address', walletAddress)
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
