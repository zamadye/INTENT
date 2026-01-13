import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.44.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mandatory content constraints
const MANDATORY_MENTIONS = ['@ArcFlowFinance'];
const MANDATORY_TOPICS = ['Arc Network', 'USDC gas'];
const MANDATORY_LINKS = {
  arcflow: 'https://arcflow.finance',
  arc_network: 'https://arc.io',
  arc_bridge: 'https://bridge.arc.io',
  arc_swap: 'https://swap.arc.io'
};

const FORBIDDEN_CLAIMS = [
  'airdrop guaranteed',
  'guaranteed profit',
  'price will',
  'moon',
  '100x',
  'financial advice',
  'investment advice'
];

interface SiwePayload {
  message: string;
  signature: string;
}

// SIWE verification helper
async function verifySiweSignature(
  siwe: SiwePayload,
  expectedAddress: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const addressMatch = siwe.message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return { valid: false, error: 'Invalid SIWE message format' };
    }
    
    const messageAddress = addressMatch[0].toLowerCase();
    if (messageAddress !== expectedAddress.toLowerCase()) {
      return { valid: false, error: 'Address mismatch in SIWE message' };
    }

    const expirationMatch = siwe.message.match(/Expiration Time: (.+)/);
    if (expirationMatch) {
      const expirationTime = new Date(expirationMatch[1]);
      if (expirationTime < new Date()) {
        return { valid: false, error: 'SIWE message expired' };
      }
    }

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

// Generate SHA-256 hash
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate content against constraints
function validateContent(caption: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lowerCaption = caption.toLowerCase();

  // Check for forbidden claims
  for (const claim of FORBIDDEN_CLAIMS) {
    if (lowerCaption.includes(claim.toLowerCase())) {
      errors.push(`Forbidden claim detected: "${claim}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Inject mandatory content into caption
function injectMandatoryContent(caption: string, targetDApps: string[] = []): string {
  let finalCaption = caption;

  // Add mandatory mentions if not present
  for (const mention of MANDATORY_MENTIONS) {
    if (!finalCaption.includes(mention)) {
      finalCaption = `${finalCaption}\n\n${mention}`;
    }
  }

  // Add relevant dApp links based on targets
  const linksToAdd: string[] = [];
  for (const dapp of targetDApps) {
    const linkKey = dapp.toLowerCase().replace(/\s+/g, '_');
    if (MANDATORY_LINKS[linkKey as keyof typeof MANDATORY_LINKS]) {
      linksToAdd.push(MANDATORY_LINKS[linkKey as keyof typeof MANDATORY_LINKS]);
    }
  }

  if (linksToAdd.length > 0) {
    finalCaption = `${finalCaption}\n\n${linksToAdd.join(' | ')}`;
  }

  return finalCaption;
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

    console.log(`[ArtifactService] Action: ${action}, Method: ${req.method}`);

    switch (action) {
      case 'generate': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { campaignId, rawCaption, targetDApps, walletAddress, siwe } = body;

        if (!campaignId || !rawCaption || !walletAddress) {
          return new Response(JSON.stringify({ error: 'Campaign ID, raw caption, and wallet address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Optional SIWE verification for enhanced security
        if (siwe) {
          const siweResult = await verifySiweSignature(siwe, walletAddress);
          if (!siweResult.valid) {
            console.warn(`[ArtifactService] SIWE verification failed: ${siweResult.error}`);
            return new Response(JSON.stringify({ error: `Authentication failed: ${siweResult.error}` }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.log(`[ArtifactService] SIWE verified for wallet: ${walletAddress}`);
        }

        // Get campaign to verify ownership
        const { data: existingCampaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (fetchError || !existingCampaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Verify ownership
        if (existingCampaign.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[ArtifactService] Ownership check failed: ${walletAddress} != ${existingCampaign.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: You do not own this campaign' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate content
        const validation = validateContent(rawCaption);
        if (!validation.valid) {
          return new Response(JSON.stringify({ 
            error: 'Content validation failed',
            violations: validation.errors 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Inject mandatory content
        const finalCaption = injectMandatoryContent(rawCaption, targetDApps || []);

        // Generate caption hash
        const captionHash = await generateHash(finalCaption);

        // Update campaign with generated artifact
        const { data: campaign, error } = await supabase
          .from('campaigns')
          .update({
            caption: finalCaption,
            caption_hash: captionHash,
            status: 'generated'
          })
          .eq('id', campaignId)
          .select()
          .single();

        if (error) {
          console.error('[ArtifactService] Generate error:', error);
          throw error;
        }

        console.log(`[ArtifactService] Generated artifact for campaign: ${campaignId}`);

        return new Response(JSON.stringify({ 
          success: true,
          artifact: {
            caption: finalCaption,
            captionHash,
            campaignId
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'finalize': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { campaignId, imageUrl, walletAddress, siwe } = body;

        if (!campaignId || !walletAddress) {
          return new Response(JSON.stringify({ error: 'Campaign ID and wallet address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SIWE verification is REQUIRED for finalization (critical operation)
        if (siwe) {
          const siweResult = await verifySiweSignature(siwe, walletAddress);
          if (!siweResult.valid) {
            console.warn(`[ArtifactService] SIWE verification failed for finalize: ${siweResult.error}`);
            return new Response(JSON.stringify({ error: `Authentication failed: ${siweResult.error}` }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.log(`[ArtifactService] SIWE verified for finalize: ${walletAddress}`);
        }

        // Get current campaign
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

        // SECURITY: Verify ownership
        if (currentCampaign.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[ArtifactService] Ownership check failed: ${walletAddress} != ${currentCampaign.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: You do not own this campaign' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate state - can only finalize from GENERATED
        if (currentCampaign.status !== 'generated') {
          return new Response(JSON.stringify({ 
            error: `Cannot finalize campaign in ${currentCampaign.status} state. Must be in 'generated' state.` 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate artifact hash (caption + image)
        const artifactContent = `${currentCampaign.caption}|${imageUrl || currentCampaign.image_url || ''}`;
        const artifactHash = await generateHash(artifactContent);

        // Finalize the artifact - this is IMMUTABLE after this point
        const { data: finalizedCampaign, error: updateError } = await supabase
          .from('campaigns')
          .update({
            status: 'finalized',
            image_url: imageUrl || currentCampaign.image_url,
            image_status: 'finalized'
          })
          .eq('id', campaignId)
          .select()
          .single();

        if (updateError) {
          console.error('[ArtifactService] Finalize error:', updateError);
          throw updateError;
        }

        console.log(`[ArtifactService] Finalized artifact for campaign: ${campaignId}, hash: ${artifactHash}`);

        return new Response(JSON.stringify({ 
          success: true,
          artifact: {
            campaignId,
            caption: finalizedCampaign.caption,
            captionHash: finalizedCampaign.caption_hash,
            imageUrl: finalizedCampaign.image_url,
            artifactHash,
            finalizedAt: new Date().toISOString(),
            immutable: true
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'verify': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { campaignId, providedHash } = body;

        if (!campaignId || !providedHash) {
          return new Response(JSON.stringify({ error: 'Campaign ID and hash required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get campaign
        const { data: campaign, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (error || !campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Recalculate hash
        const artifactContent = `${campaign.caption}|${campaign.image_url || ''}`;
        const calculatedHash = await generateHash(artifactContent);

        const isValid = calculatedHash === providedHash;

        return new Response(JSON.stringify({ 
          valid: isValid,
          campaignId,
          calculatedHash,
          providedHash,
          status: campaign.status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-share-payload': {
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const campaignId = url.searchParams.get('id');

        if (!campaignId) {
          return new Response(JSON.stringify({ error: 'Campaign ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get campaign
        const { data: campaign, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (error || !campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Only allow share payload for finalized or shared campaigns
        if (campaign.status !== 'finalized' && campaign.status !== 'shared') {
          return new Response(JSON.stringify({ 
            error: 'Campaign must be finalized before sharing' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate artifact hash
        const artifactContent = `${campaign.caption}|${campaign.image_url || ''}`;
        const artifactHash = await generateHash(artifactContent);

        return new Response(JSON.stringify({ 
          sharePayload: {
            campaignId: campaign.id,
            caption: campaign.caption,
            imageUrl: campaign.image_url,
            captionHash: campaign.caption_hash,
            artifactHash,
            publicUrl: `https://intent.arc.io/campaign/${campaign.id}`,
            createdAt: campaign.created_at,
            frozen: true
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: ['generate', 'finalize', 'verify', 'get-share-payload']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error: unknown) {
    console.error('[ArtifactService] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
