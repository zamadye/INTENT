import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.44.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generic error helper - logs details server-side, returns safe message to client
function safeError(status: number, publicMsg: string, internalDetails?: unknown): Response {
  if (internalDetails) console.error('[CampaignService] Internal:', internalDetails);
  return new Response(JSON.stringify({ error: publicMsg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

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

// ==================== INPUT VALIDATION ====================
// Input length limits for security
const INPUT_LIMITS = {
  WALLET_ADDRESS: 42,
  CUSTOM_INPUT: 5000,
  CAPTION: 5000,
  IMAGE_STYLE: 100,
  CAMPAIGN_TYPE: 100,
  CAMPAIGN_ID: 36, // UUID
  TONES_ARRAY_SIZE: 10,
  ARC_CONTEXT_ARRAY_SIZE: 10,
  TARGET_DAPPS_ARRAY_SIZE: 20,
  STRING_ARRAY_ITEM: 100,
};

function validateStringLength(str: string | undefined | null, maxLength: number, fieldName: string): { valid: boolean; error?: string } {
  if (!str) return { valid: true };
  if (typeof str !== 'string') return { valid: false, error: `${fieldName} must be a string` };
  if (str.length > maxLength) return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
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

function validateCampaignInputs(body: Record<string, unknown>): { valid: boolean; error?: string } {
  const validations = [
    validateStringLength(body.customInput as string, INPUT_LIMITS.CUSTOM_INPUT, 'customInput'),
    validateStringLength(body.imageStyle as string, INPUT_LIMITS.IMAGE_STYLE, 'imageStyle'),
    validateStringLength(body.campaignType as string, INPUT_LIMITS.CAMPAIGN_TYPE, 'campaignType'),
    validateArraySize(body.tones as unknown[], INPUT_LIMITS.TONES_ARRAY_SIZE, 'tones'),
    validateArraySize(body.arcContext as unknown[], INPUT_LIMITS.ARC_CONTEXT_ARRAY_SIZE, 'arcContext'),
    validateStringArrayItems(body.tones as string[], INPUT_LIMITS.STRING_ARRAY_ITEM, 'tones'),
    validateStringArrayItems(body.arcContext as string[], INPUT_LIMITS.STRING_ARRAY_ITEM, 'arcContext'),
  ];

  for (const validation of validations) {
    if (!validation.valid) return validation;
  }
  return { valid: true };
}
// ==================== END INPUT VALIDATION ====================

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
          return safeError(401, 'Invalid authentication', claimsError);
        }

        const userId = claimsData.user.id;
        console.log('[CampaignService] Authenticated user for create');

        const body = await req.json();
        const { walletAddress, campaignType, arcContext, tones, customInput, imageStyle, intent } = body;

        // Comprehensive input validation
        const walletValidation = validateWalletAddress(walletAddress);
        if (!walletValidation.valid) {
          return new Response(JSON.stringify({ error: walletValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const inputValidation = validateCampaignInputs(body);
        if (!inputValidation.valid) {
          return new Response(JSON.stringify({ error: inputValidation.error }), {
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
          return safeError(403, 'Unauthorized', 'Wallet mismatch');
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
          return safeError(500, 'Failed to create campaign', error);
        }

        console.log('[CampaignService] Campaign created successfully');

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

        // Input validation for transition
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

        if (!fromState || !toState) {
          return new Response(JSON.stringify({ error: 'Missing required fields (fromState, toState)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // SIWE verification for state transitions (optional but recommended for sensitive operations)
        if (siwe) {
          const siweResult = await verifySiweSignature(siwe, walletAddress);
          if (!siweResult.valid) {
            return safeError(401, 'Authentication failed', siweResult.error);
          }
          console.log('[CampaignService] SIWE verified for transition');
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
          return safeError(403, 'Unauthorized', 'Ownership check failed');
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
          return safeError(500, 'Failed to update campaign', updateError);
        }

        console.log('[CampaignService] Campaign state transitioned successfully');

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

      case 'save': {
        // Save/complete a generated campaign with full validation
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

        // Create an authenticated client to verify JWT
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const token = authHeader.replace('Bearer ', '');
        const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
        
        if (claimsError || !claimsData?.user) {
          return safeError(401, 'Invalid authentication', claimsError);
        }

        const userId = claimsData.user.id;
        console.log('[CampaignService] Save request received');

        const body = await req.json();
        const { 
          walletAddress, 
          campaignType, 
          tones, 
          arcContext, 
          customInput, 
          imageStyle,
          caption,
          captionHash,
          imageUrl,
          imageStatus,
          imagePrompt,
          generationMetadata
        } = body;

        // Comprehensive input validation
        const walletValidation = validateWalletAddress(walletAddress);
        if (!walletValidation.valid) {
          return new Response(JSON.stringify({ error: walletValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const inputValidation = validateCampaignInputs(body);
        if (!inputValidation.valid) {
          return new Response(JSON.stringify({ error: inputValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate caption
        const captionValidation = validateStringLength(caption, INPUT_LIMITS.CAPTION, 'caption');
        if (!captionValidation.valid) {
          return new Response(JSON.stringify({ error: captionValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
          return new Response(JSON.stringify({ error: 'Caption is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate captionHash (should be a hex string, max 64 chars)
        if (!captionHash || typeof captionHash !== 'string' || captionHash.length > 128) {
          return new Response(JSON.stringify({ error: 'Invalid captionHash' }), {
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
          return safeError(403, 'Unauthorized', 'Wallet mismatch');
        }

        // Insert the campaign with validated data (must start as draft due to DB constraint)
        const { data: draftCampaign, error: insertError } = await supabase
          .from('campaigns')
          .insert({
            user_id: userId,
            wallet_address: walletAddress.toLowerCase(),
            campaign_type: campaignType || 'general',
            tones: tones || [],
            arc_context: arcContext || [],
            custom_input: customInput || null,
            image_style: imageStyle || 'default',
            caption: caption.trim(),
            caption_hash: captionHash,
            image_url: imageUrl || null,
            image_status: imageStatus || 'pending',
            status: 'draft', // Must start as draft due to DB constraint
            image_prompt: imagePrompt || null,
            generation_metadata: generationMetadata || {}
          })
          .select()
          .single();
          
        if (insertError) {
          // Check for duplicate caption
          if (insertError.code === '23505') {
            return new Response(JSON.stringify({ 
              error: 'A campaign with similar content already exists. Please regenerate with different context.' 
            }), {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return safeError(500, 'Failed to save campaign', insertError);
        }
        // Transition campaign state (DB-enforced state machine): draft -> generated -> finalized
        const { data: generatedCampaign, error: generatedError } = await supabase
          .from('campaigns')
          .update({ status: 'generated' })
          .eq('id', draftCampaign.id)
          .select()
          .single();

        if (generatedError || !generatedCampaign) {
          return safeError(500, 'Failed to update campaign status', generatedError);
        }

        const { data: finalizedCampaign, error: finalizedError } = await supabase
          .from('campaigns')
          .update({ status: 'finalized' })
          .eq('id', draftCampaign.id)
          .select()
          .single();

        if (finalizedError || !finalizedCampaign) {
          return safeError(500, 'Failed to finalize campaign', finalizedError);
        }

        const campaign = finalizedCampaign;

        console.log('[CampaignService] Campaign saved successfully');

        // AUTO-GENERATE PROOF RECORD (pending - awaiting real blockchain minting)
        // This creates a shareable proof URL that can be shared on Twitter
        // SECURITY FIX: No fake tx_hash - status is 'pending' until real blockchain tx
        const intentFingerprint = generateIntentFingerprint({
          category: IntentCategory.DeFi,
          targetDApps: generationMetadata?.targetDApps || [],
          actionOrder: generationMetadata?.actionOrder || [],
          timeWindow: generationMetadata?.timeWindow || 'none'
        });

        let proof: unknown = null;

        const { data: insertedProof, error: proofError } = await supabase
          .from('nfts')
          .insert({
            campaign_id: campaign.id,
            user_id: userId,
            wallet_address: walletAddress.toLowerCase(),
            status: 'pending', // Changed from 'minted' - awaiting real blockchain tx
            intent_fingerprint: intentFingerprint,
            intent_category: IntentCategory.DeFi,
            minted_at: null, // Only set after real blockchain minting
            verified_at: null, // Only set after real verification
            tx_hash: null // Only set after real blockchain transaction
          })
          .select()
          .single();

        if (proofError) {
          console.error('[CampaignService] Proof creation error (non-fatal):', proofError);

          // If the proof already exists (or insert failed), try to return an existing one
          const { data: existingProof } = await supabase
            .from('nfts')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('user_id', userId)
            .maybeSingle();

          proof = existingProof || null;
        } else {
          console.log('[CampaignService] Proof created successfully');
          proof = insertedProof;
        }

        return new Response(JSON.stringify({
          success: true,
          campaign,
          proof
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'join': {
        // Join campaign participation with server-side validation
        // Accepts dappId from arc_dapps table (used by DailyTasksPanel)
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

        // Verify JWT
        const supabaseAuthJoin = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });

        const tokenJoin = authHeader.replace('Bearer ', '');
        const { data: claimsDataJoin, error: claimsErrorJoin } = await supabaseAuthJoin.auth.getUser(tokenJoin);
        
        if (claimsErrorJoin || !claimsDataJoin?.user) {
          return safeError(401, 'Invalid authentication', claimsErrorJoin);
        }

        const userIdJoin = claimsDataJoin.user.id;
        console.log('[CampaignService] Join request received');

        const bodyJoin = await req.json();
        const { templateId, dappId } = bodyJoin;
        
        // Support both templateId (campaign_templates) and dappId (arc_dapps)
        const targetId = dappId || templateId;

        // Validate ID format
        const idValidation = validateUUID(targetId, dappId ? 'dappId' : 'templateId');
        if (!idValidation.valid) {
          return new Response(JSON.stringify({ error: idValidation.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user's wallet address from profile (don't trust client)
        const { data: profileJoin, error: profileErrorJoin } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('user_id', userIdJoin)
          .maybeSingle();

        if (profileErrorJoin || !profileJoin) {
          return new Response(JSON.stringify({ error: 'Profile not found. Please authenticate first.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let targetName = 'Unknown';
        let targetTemplateId = targetId;

        // If dappId provided, look up in arc_dapps first
        if (dappId) {
          const { data: dapp, error: dappError } = await supabase
            .from('arc_dapps')
            .select('id, is_active, name, slug, category, description, website_url, target_contract')
            .eq('id', dappId)
            .maybeSingle();

          if (dappError || !dapp) {
            return new Response(JSON.stringify({ error: 'dApp not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!dapp.is_active) {
            return new Response(JSON.stringify({ error: 'dApp is not active' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Daily tasks are driven by arc_dapps, but participations.template_id has a FK to campaign_templates.
          // So we must resolve (or create) a campaign_template for this dApp.
          targetName = dapp.name;

          // 1) Try to find an existing template mapped to this dApp
          const { data: matchingTemplate, error: matchingTemplateError } = await supabase
            .from('campaign_templates')
            .select('id, name')
            .eq('target_dapp', dapp.slug)
            .eq('is_active', true)
            .maybeSingle();

          if (matchingTemplateError) {
            console.error('[CampaignService] Template lookup error:', matchingTemplateError);
          }

          if (matchingTemplate) {
            targetTemplateId = matchingTemplate.id;
            targetName = matchingTemplate.name;
          } else {
            // 2) Create a minimal active template for this dApp (safe defaults)
            const autoSlug = `${dapp.slug}-auto`;
            const fallbackTargetContract = dapp.target_contract || '0x0000000000000000000000000000000000000000';

            const { data: createdTemplate, error: createTemplateError } = await supabase
              .from('campaign_templates')
              .insert({
                name: `${dapp.name} (Daily Task)`,
                slug: autoSlug,
                category: dapp.category,
                description: dapp.description,
                redirect_url: dapp.website_url,
                required_event: 'daily_task',
                target_dapp: dapp.slug,
                target_contract: fallbackTargetContract,
                is_active: true,
                min_amount_usd: null,
                icon_url: null,
              })
              .select('id, name')
              .single();

            if (createTemplateError) {
              // If slug already exists (race/duplicate), try to reuse existing template.
              if (createTemplateError.code === '23505') {
                const { data: existingAutoTemplate } = await supabase
                  .from('campaign_templates')
                  .select('id, name')
                  .eq('slug', autoSlug)
                  .maybeSingle();

                if (!existingAutoTemplate) {
                  console.error('[CampaignService] Failed to reuse existing auto template after duplicate slug');
                  throw createTemplateError;
                }

                targetTemplateId = existingAutoTemplate.id;
                targetName = existingAutoTemplate.name;
              } else {
                console.error('[CampaignService] Failed to create auto template:', createTemplateError);
                throw createTemplateError;
              }
            } else {
              targetTemplateId = createdTemplate.id;
              targetName = createdTemplate.name;
            }
          }
        } else {
          // Original templateId flow - validate in campaign_templates
          const { data: template, error: templateError } = await supabase
            .from('campaign_templates')
            .select('id, is_active, name')
            .eq('id', targetId)
            .maybeSingle();

          if (templateError || !template) {
            return new Response(JSON.stringify({ error: 'Template not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!template.is_active) {
            return new Response(JSON.stringify({ error: 'Template is not active' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          targetTemplateId = template.id;
          targetName = template.name;
        }

        // Rate limiting: max 20 participations per day per user
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const { count: dailyCount, error: countError } = await supabase
          .from('campaign_participations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userIdJoin)
          .gte('created_at', todayIso);

        if (countError) {
          console.error('[CampaignService] Rate limit check error:', countError);
        } else if ((dailyCount ?? 0) >= 20) {
          return new Response(JSON.stringify({ error: 'Daily participation limit reached (max 20 per day)' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Insert participation with validated data
        const { data: participation, error: insertErrorJoin } = await supabase
          .from('campaign_participations')
          .insert({
            user_id: userIdJoin,
            wallet_address: profileJoin.wallet_address.toLowerCase(),
            template_id: targetTemplateId,
            verification_status: 'pending',
          })
          .select('id, template_id, verification_status, created_at')
          .single();

        if (insertErrorJoin) {
          // Check for duplicate (unique constraint)
          if (insertErrorJoin.code === '23505' || insertErrorJoin.message?.includes('duplicate')) {
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Already joined this task',
              alreadyJoined: true 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return safeError(500, 'Failed to join task', insertErrorJoin);
        }

        console.log('[CampaignService] User joined task successfully');

        return new Response(JSON.stringify({ 
          success: true, 
          participation,
          targetName
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default: {
        return new Response(JSON.stringify({ 
          error: 'Unknown action',
          availableActions: ['create', 'save', 'transition', 'get', 'join']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error: unknown) {
    return safeError(500, 'Internal error', error);
  }
});
