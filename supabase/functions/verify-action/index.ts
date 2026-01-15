import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ARC_RPC_URL = "https://rpc.testnet.arc.network";

// Input validation limits
const MAX_WALLET_ADDRESS_LENGTH = 42;
const MAX_ACTION_VERB_LENGTH = 50;
const MAX_DAPP_ID_LENGTH = 100;
const MAX_PARTICIPATION_ID_LENGTH = 36; // UUID format

const EVENT_SIGNATURES: Record<string, string[]> = {
  'swap': ['0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'],
  'trade': ['0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'],
  'provide_lp': ['0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f'],
  'supply': ['0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f'],
  'lend': ['0x2f00e3cdd69a77be7ed215ec7b2a36784dd158f921fca79ac29deffa353fe6ee'],
  'borrow': ['0x13ed6866d4e1ee6da46f845c46d7e54120883d75c5ea9a52ad1d3ff2fb00c168'],
  'bridge': ['0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5f3d1b72f8960e56bcfc2a7a'],
  'transfer': ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
  'stake': ['0x5dac0c1b1112564a045ba943c9d50270893e8e826c49be8e7073adc713ab7bd7'],
  'deposit': ['0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'],
  'claim': ['0x47cee97cb7acd717b3c0aa1435d004cd5b3c8c57d70dbceb4e4458bbd60e39d4'],
  'pay': ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
  'Swap': ['0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'],
  'AddLiquidity': ['0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f'],
  'TokensBridged': ['0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5f3d1b72f8960e56bcfc2a7a'],
};

interface VerifyRequest {
  walletAddress?: string;
  dappId?: string;
  actionVerb?: string;
  minAmount?: number;
  participationId?: string;
}

// Input validation helpers
function validateWalletAddress(addr: string): { valid: boolean; error?: string } {
  if (!addr || typeof addr !== 'string') {
    return { valid: false, error: 'Wallet address is required' };
  }
  if (addr.length > MAX_WALLET_ADDRESS_LENGTH) {
    return { valid: false, error: 'Invalid wallet address length' };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }
  return { valid: true };
}

function validateActionVerb(verb: string): { valid: boolean; error?: string } {
  if (!verb || typeof verb !== 'string') {
    return { valid: false, error: 'Action verb is required' };
  }
  if (verb.length > MAX_ACTION_VERB_LENGTH) {
    return { valid: false, error: 'Action verb too long' };
  }
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(verb)) {
    return { valid: false, error: 'Invalid action verb format' };
  }
  return { valid: true };
}

function validateOptionalDappId(dappId?: string): { valid: boolean; error?: string } {
  if (!dappId) return { valid: true };
  if (typeof dappId !== 'string') {
    return { valid: false, error: 'Invalid dappId type' };
  }
  if (dappId.length > MAX_DAPP_ID_LENGTH) {
    return { valid: false, error: 'DappId too long' };
  }
  return { valid: true };
}

function validateOptionalParticipationId(id?: string): { valid: boolean; error?: string } {
  if (!id) return { valid: true };
  if (typeof id !== 'string') {
    return { valid: false, error: 'Invalid participationId type' };
  }
  if (id.length > MAX_PARTICIPATION_ID_LENGTH) {
    return { valid: false, error: 'ParticipationId too long' };
  }
  // UUID format validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { valid: false, error: 'Invalid participationId format (expected UUID)' };
  }
  return { valid: true };
}

function validateOptionalMinAmount(minAmount?: number): { valid: boolean; error?: string } {
  if (minAmount === undefined || minAmount === null) return { valid: true };
  if (typeof minAmount !== 'number' || !isFinite(minAmount)) {
    return { valid: false, error: 'Invalid minAmount type' };
  }
  if (minAmount < 0 || minAmount > 1e18) {
    return { valid: false, error: 'minAmount out of valid range' };
  }
  return { valid: true };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Require JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn('[verify-action] Invalid JWT:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-action] Authenticated user: ${user.id}`);

    const body = await req.json() as VerifyRequest;
    const { walletAddress, dappId, actionVerb, minAmount, participationId } = body;

    // Comprehensive input validation
    const walletValidation = validateWalletAddress(walletAddress || '');
    if (!walletValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: walletValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actionValidation = validateActionVerb(actionVerb || '');
    if (!actionValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: actionValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dappIdValidation = validateOptionalDappId(dappId);
    if (!dappIdValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: dappIdValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const participationIdValidation = validateOptionalParticipationId(participationId);
    if (!participationIdValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: participationIdValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const minAmountValidation = validateOptionalMinAmount(minAmount);
    if (!minAmountValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: minAmountValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify wallet ownership - user can only verify their own wallet
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found. Please authenticate first.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.wallet_address.toLowerCase() !== walletAddress!.toLowerCase()) {
      console.warn(`[verify-action] Wallet mismatch: ${walletAddress} != ${profile.wallet_address}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: You can only verify your own wallet' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-action] Verifying ${actionVerb} for ${walletAddress}`);

    const signatures = EVENT_SIGNATURES[actionVerb!] || EVENT_SIGNATURES['transfer'];

    // Get current block
    const blockResponse = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    });
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);
    const fromBlock = Math.max(0, currentBlock - 3600);

    // Search for matching events
    for (const sig of signatures) {
      const logsResponse = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            fromBlock: '0x' + fromBlock.toString(16),
            toBlock: 'latest',
            topics: [sig, '0x000000000000000000000000' + walletAddress!.slice(2).toLowerCase()],
          }],
          id: 2,
        }),
      });

      const logsData = await logsResponse.json();
      const logs = logsData.result || [];

      if (logs.length > 0) {
        const log = logs[0];
        let amount: number | null = null;
        
        if (log.data && log.data !== '0x' && log.data.length >= 66) {
          amount = parseInt(log.data.slice(0, 66), 16) / 1e6;
        }

        if (minAmount && amount && amount < minAmount) continue;

        console.log(`[verify-action] Found TX: ${log.transactionHash} for user: ${user.id}`);
        
        return new Response(
          JSON.stringify({ success: true, verified: true, txHash: log.transactionHash, amount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, verified: false, message: `No ${actionVerb} found. Try again after completing the action.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-action] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
