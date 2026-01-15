import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Arc Testnet RPC
const ARC_RPC_URL = "https://rpc.testnet.arc.network";

// Event signatures for different action types
const EVENT_SIGNATURES: Record<string, string> = {
  // Swap events (common DEX signatures)
  'Swap': '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Uniswap V2 style
  // AddLiquidity events
  'AddLiquidity': '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f', // Mint (LP)
  // Bridge events
  'TokensBridged': '0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5f3d1b72f8960e56bcfc2a7a', // Generic bridge
};

interface VerifyRequest {
  participationId: string;
  walletAddress: string;
  signature: string;
  message: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { participationId, walletAddress, signature, message } = await req.json() as VerifyRequest;

    console.log(`[verify-action] Starting verification for participation ${participationId}`);

    // 1. Fetch participation with template info
    const { data: participation, error: fetchError } = await supabase
      .from('campaign_participations')
      .select(`
        *,
        template:campaign_templates(*)
      `)
      .eq('id', participationId)
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle();

    if (fetchError || !participation) {
      console.error('[verify-action] Participation not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Participation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (participation.verification_status === 'verified') {
      return new Response(
        JSON.stringify({ success: true, already_verified: true, message: 'Already verified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = participation.template;
    const joinedAt = new Date(participation.joined_at).getTime() / 1000; // Unix timestamp

    console.log(`[verify-action] Checking for ${template.required_event} events after ${participation.joined_at}`);

    // 2. Query on-chain for events
    const eventSignature = EVENT_SIGNATURES[template.required_event];
    if (!eventSignature) {
      console.error(`[verify-action] Unknown event type: ${template.required_event}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unknown event type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current block number
    const blockResponse = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    const blockData = await blockResponse.json();
    const currentBlock = parseInt(blockData.result, 16);

    // Look back ~1 hour worth of blocks (assuming ~2s block time)
    const fromBlock = Math.max(0, currentBlock - 1800);

    console.log(`[verify-action] Scanning blocks ${fromBlock} to ${currentBlock}`);

    // Get logs for the wallet
    const logsResponse = await fetch(ARC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: 'latest',
          address: template.target_contract,
          topics: [
            eventSignature,
            // Wallet address as topic (padded to 32 bytes)
            '0x000000000000000000000000' + walletAddress.slice(2).toLowerCase(),
          ],
        }],
        id: 2,
      }),
    });

    const logsData = await logsResponse.json();
    const logs = logsData.result || [];

    console.log(`[verify-action] Found ${logs.length} matching events`);

    // 3. Filter logs by timestamp (after join)
    let verifiedTx: string | null = null;
    let verifiedAmount: number | null = null;

    for (const log of logs) {
      // Get block timestamp
      const blockTimestampResponse = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: [log.blockNumber, false],
          id: 3,
        }),
      });
      const blockInfo = await blockTimestampResponse.json();
      const blockTimestamp = parseInt(blockInfo.result?.timestamp || '0', 16);

      if (blockTimestamp >= joinedAt) {
        verifiedTx = log.transactionHash;
        // Try to extract amount from data (simplified - would need ABI decoding for production)
        if (log.data && log.data !== '0x') {
          // First 32 bytes of data is often amount
          const amountHex = log.data.slice(0, 66);
          verifiedAmount = parseInt(amountHex, 16) / 1e18; // Assuming 18 decimals
        }
        break;
      }
    }

    // 4. Alternative: Check transactions directly if no events found
    if (!verifiedTx) {
      console.log('[verify-action] No matching events, checking direct transactions...');
      
      // Get transaction count to scan recent txs
      const txCountResponse = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionCount',
          params: [walletAddress, 'latest'],
          id: 4,
        }),
      });
      const txCountData = await txCountResponse.json();
      const txCount = parseInt(txCountData.result, 16);

      // For MVP, we'll check if wallet has interacted with target contract
      // In production, you'd use indexer or trace API
      console.log(`[verify-action] Wallet has ${txCount} total transactions`);
    }

    // 5. Update participation status
    if (verifiedTx) {
      const { error: updateError } = await supabase
        .from('campaign_participations')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_tx_hash: verifiedTx,
          verified_amount: verifiedAmount,
        })
        .eq('id', participationId);

      if (updateError) {
        console.error('[verify-action] Failed to update participation:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update verification status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[verify-action] Verification successful! TX: ${verifiedTx}`);
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          tx_hash: verifiedTx,
          amount: verifiedAmount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Not verified yet - could be pending
      const { error: updateError } = await supabase
        .from('campaign_participations')
        .update({
          verification_status: 'pending',
          verification_error: 'No qualifying transaction found after join time. Please complete the required action and try again.',
        })
        .eq('id', participationId);

      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          message: 'No qualifying transaction found. Complete the required action on the dApp first.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[verify-action] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
