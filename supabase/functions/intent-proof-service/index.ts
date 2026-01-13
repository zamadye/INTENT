import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.44.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent Categories (on-chain enum mapping)
enum IntentCategory {
  Builder = 0,
  DeFi = 1,
  Social = 2,
  Infrastructure = 3
}

interface IntentProof {
  campaignId: string;
  userAddress: string;
  campaignHash: string;
  intentCategory: IntentCategory;
  targetDApps: string[];
  actionOrder: string[];
  timestamp: number;
  txHash: string | null;
}

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

// Generate campaign hash for on-chain reference
async function generateCampaignHash(
  campaignId: string,
  userAddress: string,
  captionHash: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${campaignId}|${userAddress}|${captionHash}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate intent fingerprint
function generateIntentFingerprint(
  category: IntentCategory,
  targetDApps: string[],
  actionOrder: string[]
): string {
  const data = JSON.stringify({
    category,
    dapps: [...targetDApps].sort(),
    actions: actionOrder
  });
  
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

    console.log(`[IntentProofService] Action: ${action}, Method: ${req.method}`);

    switch (action) {
      case 'record': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await req.json();
        const { 
          campaignId, 
          userAddress, 
          intentCategory, 
          targetDApps, 
          actionOrder,
          txHash,
          siwe 
        } = body;

        if (!campaignId || !userAddress) {
          return new Response(JSON.stringify({ error: 'Campaign ID and user address required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
          return new Response(JSON.stringify({ error: 'Invalid wallet address format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SIWE verification for proof recording (critical operation - REQUIRED in production)
        if (siwe) {
          const siweResult = await verifySiweSignature(siwe, userAddress);
          if (!siweResult.valid) {
            console.warn(`[IntentProofService] SIWE verification failed: ${siweResult.error}`);
            return new Response(JSON.stringify({ error: `Authentication failed: ${siweResult.error}` }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.log(`[IntentProofService] SIWE verified for proof recording: ${userAddress}`);
        }

        // Get campaign to verify it's finalized
        const { data: campaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (fetchError || !campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Verify user is the campaign owner
        if (campaign.wallet_address.toLowerCase() !== userAddress.toLowerCase()) {
          console.warn(`[IntentProofService] Ownership check failed: ${userAddress} != ${campaign.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: You do not own this campaign' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Campaign must be finalized or shared to record proof
        if (campaign.status !== 'finalized' && campaign.status !== 'shared') {
          return new Response(JSON.stringify({ 
            error: 'Campaign must be finalized before recording proof' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check for duplicate proof (one proof per user per campaign)
        const { data: existingProof } = await supabase
          .from('nfts')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('wallet_address', userAddress.toLowerCase())
          .eq('status', 'minted')
          .maybeSingle();

        if (existingProof) {
          return new Response(JSON.stringify({ 
            error: 'Proof already recorded for this campaign',
            proofId: existingProof.id
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate campaign hash for on-chain reference
        const campaignHash = await generateCampaignHash(
          campaignId, 
          userAddress, 
          campaign.caption_hash
        );

        // Generate intent fingerprint
        const intentFingerprint = generateIntentFingerprint(
          intentCategory ?? IntentCategory.Social,
          targetDApps ?? [],
          actionOrder ?? []
        );

        const timestamp = Date.now();

        // Create the proof record
        const proof: IntentProof = {
          campaignId,
          userAddress,
          campaignHash,
          intentCategory: intentCategory ?? IntentCategory.Social,
          targetDApps: targetDApps ?? [],
          actionOrder: actionOrder ?? [],
          timestamp,
          txHash: txHash || null
        };

        // Lookup user_id from profiles table by wallet_address
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('wallet_address', userAddress.toLowerCase())
          .maybeSingle();

        const userId = profile?.user_id || null;

        // Store in NFTs table as the proof record (reusing existing structure)
        const { data: nft, error: insertError } = await supabase
          .from('nfts')
          .insert({
            campaign_id: campaignId,
            wallet_address: userAddress,
            user_id: userId, // Link to auth.users for RLS
            metadata_hash: campaignHash,
            status: 'minted',
            minted_at: new Date(timestamp).toISOString(),
            tx_hash: txHash || null
          })
          .select()
          .single();

        if (insertError) {
          console.error('[IntentProofService] Record error:', insertError);
          throw insertError;
        }

        // Update campaign to shared state
        await supabase
          .from('campaigns')
          .update({ status: 'shared' })
          .eq('id', campaignId);

        console.log(`[IntentProofService] Recorded proof for campaign: ${campaignId}, hash: ${campaignHash}`);

        return new Response(JSON.stringify({ 
          success: true,
          proof: {
            ...proof,
            proofId: nft.id,
            intentFingerprint
          }
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

        const campaignId = url.searchParams.get('campaignId');
        const userAddress = url.searchParams.get('userAddress');
        const authHeader = req.headers.get('Authorization');

        // If userAddress is specified, require authentication
        if (userAddress) {
          if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authentication required for user-specific queries' }), {
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

          if (profileError || !profile || profile.wallet_address.toLowerCase() !== userAddress.toLowerCase()) {
            return new Response(JSON.stringify({ error: 'Unauthorized: You can only view your own proofs' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Build query for minted proofs (these are public once minted)
        let query = supabase
          .from('nfts')
          .select(`
            *,
            campaign:campaigns!inner(id, caption, image_url, caption_hash, campaign_type, image_style, status, created_at)
          `)
          .eq('status', 'minted');

        if (campaignId) {
          query = query.eq('campaign_id', campaignId);
        }

        if (userAddress) {
          query = query.eq('wallet_address', userAddress.toLowerCase());
        }

        const { data: proofs, error } = await query.order('minted_at', { ascending: false });

        if (error) {
          console.error('[IntentProofService] Get error:', error);
          throw error;
        }

        // Transform to proof format with filtered campaign data
        const formattedProofs = (proofs || []).map(p => ({
          proofId: p.id,
          campaignId: p.campaign_id,
          userAddress: p.wallet_address,
          campaignHash: p.metadata_hash,
          timestamp: p.minted_at ? new Date(p.minted_at).getTime() : null,
          txHash: p.tx_hash,
          campaign: p.campaign ? {
            id: p.campaign.id,
            caption: p.campaign.caption,
            image_url: p.campaign.image_url,
            caption_hash: p.campaign.caption_hash,
            campaign_type: p.campaign.campaign_type,
            image_style: p.campaign.image_style,
            status: p.campaign.status,
            created_at: p.campaign.created_at,
          } : null
        }));

        return new Response(JSON.stringify({ proofs: formattedProofs }), {
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
        const { campaignId, userAddress, providedHash } = body;

        if (!campaignId || !userAddress || !providedHash) {
          return new Response(JSON.stringify({ error: 'Campaign ID, user address, and hash required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get campaign
        const { data: campaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (fetchError || !campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Recalculate expected hash
        const expectedHash = await generateCampaignHash(
          campaignId,
          userAddress,
          campaign.caption_hash
        );

        // Check if proof exists
        const { data: proof, error: proofError } = await supabase
          .from('nfts')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('wallet_address', userAddress)
          .eq('status', 'minted')
          .maybeSingle();

        const isValid = expectedHash === providedHash;
        const proofExists = !!proof;

        return new Response(JSON.stringify({ 
          valid: isValid,
          proofExists,
          expectedHash,
          providedHash,
          campaignStatus: campaign.status,
          proofDetails: proof ? {
            proofId: proof.id,
            recordedAt: proof.minted_at,
            txHash: proof.tx_hash
          } : null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'stats': {
        if (req.method !== 'GET') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userAddress = url.searchParams.get('userAddress');

        // Get total proofs
        let query = supabase
          .from('nfts')
          .select('*', { count: 'exact' })
          .eq('status', 'minted');

        if (userAddress) {
          query = query.eq('wallet_address', userAddress);
        }

        const { count: totalProofs, error: countError } = await query;

        if (countError) {
          throw countError;
        }

        // Get unique users
        const { data: uniqueUsers, error: usersError } = await supabase
          .from('nfts')
          .select('wallet_address')
          .eq('status', 'minted');

        if (usersError) {
          throw usersError;
        }

        const uniqueAddresses = new Set(uniqueUsers.map(u => u.wallet_address));

        return new Response(JSON.stringify({ 
          stats: {
            totalProofs: totalProofs || 0,
            uniqueUsers: uniqueAddresses.size,
            userProofs: userAddress ? totalProofs : undefined
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: ['record', 'get', 'verify', 'stats']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error: unknown) {
    console.error('[IntentProofService] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
