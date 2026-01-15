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

// ==================== INPUT VALIDATION ====================
const INPUT_LIMITS = {
  WALLET_ADDRESS: 42,
  CAMPAIGN_ID: 36, // UUID
  TX_HASH: 66, // 0x + 64 hex chars
  TARGET_DAPPS_ARRAY_SIZE: 20,
  ACTION_ORDER_ARRAY_SIZE: 20,
  STRING_ARRAY_ITEM: 100,
};

function validateWalletAddress(addr: string): { valid: boolean; error?: string } {
  if (!addr || typeof addr !== 'string') return { valid: false, error: 'Wallet address is required' };
  if (addr.length > INPUT_LIMITS.WALLET_ADDRESS) return { valid: false, error: 'Invalid wallet address length' };
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return { valid: false, error: 'Invalid wallet address format' };
  return { valid: true };
}

function validateUUID(id: string | undefined | null, fieldName: string): { valid: boolean; error?: string } {
  if (!id) return { valid: false, error: `${fieldName} is required` };
  if (typeof id !== 'string') return { valid: false, error: `${fieldName} must be a string` };
  if (id.length > INPUT_LIMITS.CAMPAIGN_ID) return { valid: false, error: `${fieldName} too long` };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { valid: false, error: `Invalid ${fieldName} format` };
  }
  return { valid: true };
}

function validateOptionalTxHash(hash: string | undefined | null): { valid: boolean; error?: string } {
  if (!hash) return { valid: true };
  if (typeof hash !== 'string') return { valid: false, error: 'txHash must be a string' };
  if (hash.length > INPUT_LIMITS.TX_HASH) return { valid: false, error: 'txHash too long' };
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) return { valid: false, error: 'Invalid txHash format' };
  return { valid: true };
}

function validateArraySize(arr: unknown[] | undefined | null, maxSize: number, fieldName: string): { valid: boolean; error?: string } {
  if (!arr) return { valid: true };
  if (!Array.isArray(arr)) return { valid: false, error: `${fieldName} must be an array` };
  if (arr.length > maxSize) return { valid: false, error: `${fieldName} exceeds maximum size of ${maxSize}` };
  return { valid: true };
}

function validateStringArrayItems(arr: string[] | undefined | null, maxItemLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (!arr) return { valid: true };
  for (const item of arr) {
    if (typeof item !== 'string' || item.length > maxItemLength) {
      return { valid: false, error: `${fieldName} contains invalid item (max ${maxItemLength} chars per item)` };
    }
  }
  return { valid: true };
}

function validateIntentCategory(category: number | undefined | null): { valid: boolean; error?: string } {
  if (category === undefined || category === null) return { valid: true };
  if (typeof category !== 'number' || !Number.isInteger(category)) {
    return { valid: false, error: 'intentCategory must be an integer' };
  }
  if (category < 0 || category > 3) { // IntentCategory enum: 0-3
    return { valid: false, error: 'intentCategory must be 0-3' };
  }
  return { valid: true };
}
// ==================== END INPUT VALIDATION ====================

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1] || 'default';
    const authHeader = req.headers.get('Authorization');

    console.log(`[IntentProofService] Action: ${action}, Method: ${req.method}`);

    switch (action) {
      case 'record': {
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Require JWT authentication for proof recording
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
          console.warn('[IntentProofService] Invalid JWT:', claimsError?.message);
          return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userId = claimsData.user.id;
        console.log(`[IntentProofService] Authenticated user: ${userId}`);

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

        // Comprehensive input validation
        const campaignIdValidation = validateUUID(campaignId, 'campaignId');
        if (!campaignIdValidation.valid) {
          return new Response(JSON.stringify({ error: campaignIdValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const walletValidation = validateWalletAddress(userAddress);
        if (!walletValidation.valid) {
          return new Response(JSON.stringify({ error: walletValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const txHashValidation = validateOptionalTxHash(txHash);
        if (!txHashValidation.valid) {
          return new Response(JSON.stringify({ error: txHashValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const categoryValidation = validateIntentCategory(intentCategory);
        if (!categoryValidation.valid) {
          return new Response(JSON.stringify({ error: categoryValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const targetDAppsValidation = validateArraySize(targetDApps, INPUT_LIMITS.TARGET_DAPPS_ARRAY_SIZE, 'targetDApps');
        if (!targetDAppsValidation.valid) {
          return new Response(JSON.stringify({ error: targetDAppsValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const targetDAppsItemsValidation = validateStringArrayItems(targetDApps, INPUT_LIMITS.STRING_ARRAY_ITEM, 'targetDApps');
        if (!targetDAppsItemsValidation.valid) {
          return new Response(JSON.stringify({ error: targetDAppsItemsValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const actionOrderValidation = validateArraySize(actionOrder, INPUT_LIMITS.ACTION_ORDER_ARRAY_SIZE, 'actionOrder');
        if (!actionOrderValidation.valid) {
          return new Response(JSON.stringify({ error: actionOrderValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const actionOrderItemsValidation = validateStringArrayItems(actionOrder, INPUT_LIMITS.STRING_ARRAY_ITEM, 'actionOrder');
        if (!actionOrderItemsValidation.valid) {
          return new Response(JSON.stringify({ error: actionOrderItemsValidation.error }), {
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

        if (profile.wallet_address.toLowerCase() !== userAddress.toLowerCase()) {
          console.warn(`[IntentProofService] Wallet mismatch: ${userAddress} != ${profile.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: Wallet address does not match your profile' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SIWE verification for proof recording (optional extra security layer)
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

        // Get campaign to verify it's finalized (explicit field selection)
        const { data: campaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('id, wallet_address, caption_hash, status')
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

        // Store in NFTs table as the proof record (reusing existing structure)
        const { data: nft, error: insertError } = await supabase
          .from('nfts')
          .insert({
            campaign_id: campaignId,
            wallet_address: userAddress,
            user_id: userId, // Always set from authenticated JWT
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

        console.log(`[IntentProofService] Recorded proof for campaign: ${campaignId}, hash: ${campaignHash}, user: ${userId}`);

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

        // Get campaign (explicit field selection for verification)
        const { data: campaign, error: fetchError } = await supabase
          .from('campaigns')
          .select('id, caption_hash, status')
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

        // Check if proof exists (explicit field selection)
        const { data: proof, error: proofError } = await supabase
          .from('nfts')
          .select('id, minted_at, tx_hash')
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

      case 'mint': {
        // Server-side NFT minting record with comprehensive validation
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Require JWT authentication
        if (!authHeader?.startsWith('Bearer ')) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const supabaseAuthMint = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const tokenMint = authHeader.replace('Bearer ', '');
        const { data: claimsDataMint, error: claimsErrorMint } = await supabaseAuthMint.auth.getUser(tokenMint);
        
        if (claimsErrorMint || !claimsDataMint?.user) {
          console.warn('[IntentProofService] Invalid JWT for mint:', claimsErrorMint?.message);
          return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userIdMint = claimsDataMint.user.id;
        console.log(`[IntentProofService] Mint request from user: ${userIdMint}`);

        const body = await req.json();
        const { 
          campaignId, 
          walletAddress, 
          tokenId, 
          txHash, 
          metadataHash, 
          proofCost 
        } = body;

        // Comprehensive input validation
        const campaignIdValidation = validateUUID(campaignId, 'campaignId');
        if (!campaignIdValidation.valid) {
          return new Response(JSON.stringify({ error: campaignIdValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const walletValidation = validateWalletAddress(walletAddress);
        if (!walletValidation.valid) {
          return new Response(JSON.stringify({ error: walletValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate optional txHash
        const txHashValidation = validateOptionalTxHash(txHash);
        if (!txHashValidation.valid) {
          return new Response(JSON.stringify({ error: txHashValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate tokenId (string, max 100 chars)
        if (tokenId && (typeof tokenId !== 'string' || tokenId.length > 100)) {
          return new Response(JSON.stringify({ error: 'Invalid tokenId format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate metadataHash (string, max 128 chars)
        if (metadataHash && (typeof metadataHash !== 'string' || metadataHash.length > 128)) {
          return new Response(JSON.stringify({ error: 'Invalid metadataHash format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate proofCost (number, positive)
        if (proofCost !== undefined && (typeof proofCost !== 'number' || proofCost < 0 || proofCost > 10000)) {
          return new Response(JSON.stringify({ error: 'Invalid proofCost' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SECURITY: Verify wallet ownership - user's profile wallet must match request wallet
        const { data: profileMint, error: profileErrorMint } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('user_id', userIdMint)
          .maybeSingle();

        if (profileErrorMint || !profileMint) {
          return new Response(JSON.stringify({ error: 'Profile not found. Please authenticate first.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (profileMint.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.warn(`[IntentProofService] Wallet mismatch: ${walletAddress} != ${profileMint.wallet_address}`);
          return new Response(JSON.stringify({ error: 'Unauthorized: Wallet address does not match your profile' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify campaign exists and user owns it
        const { data: campaignMint, error: campaignErrorMint } = await supabase
          .from('campaigns')
          .select('id, wallet_address, status')
          .eq('id', campaignId)
          .maybeSingle();

        if (campaignErrorMint || !campaignMint) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (campaignMint.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          return new Response(JSON.stringify({ error: 'Unauthorized: You do not own this campaign' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Insert NFT record with validated data
        const { data: nft, error: insertError } = await supabase
          .from('nfts')
          .insert({
            user_id: userIdMint,
            campaign_id: campaignId,
            wallet_address: walletAddress.toLowerCase(),
            token_id: tokenId || null,
            tx_hash: txHash || null,
            metadata_hash: metadataHash || null,
            proof_cost: proofCost || null,
            status: 'minted',
            minted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('[IntentProofService] Mint insert error:', insertError);
          throw insertError;
        }

        // Update campaign status to 'minted'
        await supabase
          .from('campaigns')
          .update({ status: 'shared' }) // Mark as shared (final state)
          .eq('id', campaignId);

        // Update user profile stats
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('nfts_minted, campaigns_created')
          .eq('user_id', userIdMint)
          .maybeSingle();

        if (existingProfile) {
          await supabase
            .from('profiles')
            .update({ 
              nfts_minted: (existingProfile.nfts_minted || 0) + 1,
              campaigns_created: (existingProfile.campaigns_created || 0) + 1
            })
            .eq('user_id', userIdMint);
        }

        console.log(`[IntentProofService] Minted NFT: ${nft.id} for campaign: ${campaignId}, user: ${userIdMint}`);

        return new Response(JSON.stringify({ 
          success: true, 
          nft: {
            id: nft.id,
            campaignId: nft.campaign_id,
            tokenId: nft.token_id,
            txHash: nft.tx_hash,
            status: nft.status,
            mintedAt: nft.minted_at
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: ['record', 'mint', 'get', 'verify', 'stats']
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
