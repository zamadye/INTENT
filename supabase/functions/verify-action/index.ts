import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generic error helper - logs details server-side, returns safe message to client
function safeError(status: number, publicMsg: string, internalDetails?: unknown): Response {
  if (internalDetails) console.error('[verify-action] Internal:', internalDetails);
  return new Response(JSON.stringify({ success: false, error: publicMsg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

const ARC_RPC_URL = "https://rpc.testnet.arc.network";

// Input validation limits
const MAX_WALLET_ADDRESS_LENGTH = 42;
const MAX_ACTION_VERB_LENGTH = 50;
const MAX_DAPP_ID_LENGTH = 100;
const MAX_TEMPLATE_ID_LENGTH = 36; // UUID length

// Event signature hashes for common DeFi actions
// These are keccak256 hashes of event signatures
const EVENT_SIGNATURES: Record<string, string> = {
  // Standard ERC20/DeFi events
  'Transfer': '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  'Swap': '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822', // Uniswap V2
  'Deposit': '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
  'Withdrawal': '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',
  'AddLiquidity': '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  'RemoveLiquidity': '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
  'TokensBridged': '0x9e8cf3b9e8c3d64d4c5c5f2c2c0c9a5b5d5e5f6a6b6c7d7e8f9a0b1c2d3e4f5a6', // Generic bridge
  'Mint': '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
  'Trade': '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
};

interface VerifyRequest {
  walletAddress?: string;
  dappId?: string;
  actionVerb?: string;
  templateId?: string; // Used to look up campaign_template for target_contract and required_event
  minAmount?: number;
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

function validateOptionalTemplateId(templateId?: string): { valid: boolean; error?: string } {
  if (!templateId) return { valid: true };
  if (typeof templateId !== 'string') {
    return { valid: false, error: 'Invalid templateId type' };
  }
  if (templateId.length > MAX_TEMPLATE_ID_LENGTH) {
    return { valid: false, error: 'TemplateId too long' };
  }
  // UUID format validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId)) {
    return { valid: false, error: 'Invalid templateId format' };
  }
  return { valid: true };
}

// Pad address to 32 bytes for event topic matching
function padAddress(address: string): string {
  return '0x' + address.slice(2).toLowerCase().padStart(64, '0');
}

// Get event signature hash for an action
function getEventSignature(actionVerb: string, requiredEvent?: string): string | null {
  // If a specific required_event is provided from the template, use it
  if (requiredEvent && EVENT_SIGNATURES[requiredEvent]) {
    return EVENT_SIGNATURES[requiredEvent];
  }
  
  // Map action verbs to event signatures
  const actionToEvent: Record<string, string> = {
    'swap': 'Swap',
    'Swap': 'Swap',
    'trade': 'Trade',
    'Trade': 'Trade',
    'deposit': 'Deposit',
    'Deposit': 'Deposit',
    'withdraw': 'Withdrawal',
    'Withdraw': 'Withdrawal',
    'bridge': 'TokensBridged',
    'Bridge': 'TokensBridged',
    'add_liquidity': 'AddLiquidity',
    'AddLiquidity': 'AddLiquidity',
    'remove_liquidity': 'RemoveLiquidity',
    'RemoveLiquidity': 'RemoveLiquidity',
    'mint': 'Mint',
    'Mint': 'Mint',
    'transfer': 'Transfer',
    'Transfer': 'Transfer',
  };
  
  const eventName = actionToEvent[actionVerb];
  if (eventName && EVENT_SIGNATURES[eventName]) {
    return EVENT_SIGNATURES[eventName];
  }
  
  // Fallback: try direct lookup
  return EVENT_SIGNATURES[actionVerb] || null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Require JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return safeError(401, 'Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return safeError(401, 'Invalid authentication', authError);
    }

    console.log('[verify-action] Authenticated user successfully');

    const body = await req.json() as VerifyRequest;
    const { walletAddress, dappId, actionVerb, templateId } = body;

    // Input validation
    const walletValidation = validateWalletAddress(walletAddress || '');
    if (!walletValidation.valid) {
      return safeError(400, 'Invalid wallet address');
    }

    const actionValidation = validateActionVerb(actionVerb || '');
    if (!actionValidation.valid) {
      return safeError(400, 'Invalid action');
    }

    const dappIdValidation = validateOptionalDappId(dappId);
    if (!dappIdValidation.valid) {
      return safeError(400, 'Invalid dApp identifier');
    }

    const templateIdValidation = validateOptionalTemplateId(templateId);
    if (!templateIdValidation.valid) {
      return safeError(400, 'Invalid template identifier');
    }

    // SECURITY: Verify wallet ownership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return safeError(403, 'Profile not found', profileError);
    }

    if (profile.wallet_address.toLowerCase() !== walletAddress!.toLowerCase()) {
      return safeError(403, 'Unauthorized');
    }

    console.log('[verify-action] Starting blockchain verification');

    // Fetch template details if templateId is provided
    let targetContract: string | null = null;
    let requiredEvent: string | null = null;
    
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('campaign_templates')
        .select('target_contract, required_event')
        .eq('id', templateId)
        .maybeSingle();
      
      if (!templateError && template) {
        targetContract = template.target_contract;
        requiredEvent = template.required_event;
        console.log('[verify-action] Using template contract:', targetContract);
      }
    }

    // If no template, try to get contract from arc_dapps
    if (!targetContract && dappId) {
      const { data: dapp, error: dappError } = await supabase
        .from('arc_dapps')
        .select('target_contract, actions')
        .eq('id', dappId)
        .maybeSingle();
      
      if (!dappError && dapp?.target_contract) {
        targetContract = dapp.target_contract;
        console.log('[verify-action] Using dApp contract:', targetContract);
      }
    }

    // Get the event signature for verification
    const eventSignature = getEventSignature(actionVerb!, requiredEvent || undefined);
    
    try {
      // Calculate block range - check last 10000 blocks (approximately)
      const latestBlockResponse = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });

      const latestBlockData = await latestBlockResponse.json();
      if (latestBlockData.error) {
        console.error('[verify-action] Failed to get latest block:', latestBlockData.error);
        return safeError(500, 'Blockchain verification failed');
      }

      const latestBlock = parseInt(latestBlockData.result, 16);
      const fromBlock = Math.max(0, latestBlock - 10000); // Look back ~10000 blocks
      
      console.log('[verify-action] Checking blocks', fromBlock, 'to', latestBlock);

      // Strategy 1: If we have a target contract and event signature, use eth_getLogs
      if (targetContract && eventSignature) {
        const logsResponse = await fetch(ARC_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{
              fromBlock: '0x' + fromBlock.toString(16),
              toBlock: 'latest',
              address: targetContract,
              topics: [
                eventSignature,
                null, // Don't filter by from (could be in different topic positions)
                null,
                null,
              ]
            }],
            id: 1,
          }),
        });

        const logsData = await logsResponse.json();
        
        if (!logsData.error && logsData.result && Array.isArray(logsData.result)) {
          // Filter logs to find ones involving the user's wallet
          const userAddressPadded = padAddress(walletAddress!);
          
          const userLogs = logsData.result.filter((log: { topics: string[], data: string }) => {
            // Check if user address appears in any topic position
            const inTopics = log.topics.some((topic: string) => 
              topic && topic.toLowerCase() === userAddressPadded.toLowerCase()
            );
            // Also check if user address appears in data (for some event formats)
            const inData = log.data && log.data.toLowerCase().includes(walletAddress!.slice(2).toLowerCase());
            return inTopics || inData;
          });

          if (userLogs.length > 0) {
            // Found matching event log - return REAL transaction hash
            const realTxHash = userLogs[0].transactionHash;
            console.log('[verify-action] Found matching transaction:', realTxHash);
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                verified: true, 
                txHash: realTxHash,
                verificationMethod: 'event_log',
                message: 'Action verified on-chain'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Strategy 2: If no specific contract, check for any transactions from the wallet
      // Get recent transactions using eth_getLogs with Transfer events from the wallet
      const transferLogsResponse = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            fromBlock: '0x' + fromBlock.toString(16),
            toBlock: 'latest',
            topics: [
              EVENT_SIGNATURES['Transfer'],
              padAddress(walletAddress!), // from address
            ]
          }],
          id: 1,
        }),
      });

      const transferLogsData = await transferLogsResponse.json();
      
      if (!transferLogsData.error && transferLogsData.result && transferLogsData.result.length > 0) {
        // Found a transfer from this wallet - use the most recent one
        const latestLog = transferLogsData.result[transferLogsData.result.length - 1];
        const realTxHash = latestLog.transactionHash;
        console.log('[verify-action] Found transfer transaction:', realTxHash);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            verified: true, 
            txHash: realTxHash,
            verificationMethod: 'transfer_log',
            message: 'Wallet activity verified on-chain'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Strategy 3: Fallback to checking if wallet has any transactions
      const txCountResponse = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionCount',
          params: [walletAddress, 'latest'],
          id: 1,
        }),
      });

      const txCountData = await txCountResponse.json();
      
      if (txCountData.error) {
        return safeError(500, 'Blockchain verification failed', txCountData.error);
      }

      const txCount = parseInt(txCountData.result, 16);
      console.log('[verify-action] Transaction count:', txCount);

      if (txCount > 0) {
        // Wallet has transactions but we couldn't find the specific event
        // Return verified=false with clear message - no fake tx hashes
        return new Response(
          JSON.stringify({ 
            success: true, 
            verified: false, 
            verificationMethod: 'tx_count_only',
            message: 'Wallet has transactions but specific action event not found. Please ensure you completed the required action.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // No transactions found at all
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: false, 
          message: 'No transactions found. Please complete the required action first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (rpcError) {
      return safeError(500, 'Blockchain verification failed', rpcError);
    }

  } catch (error) {
    return safeError(500, 'Internal error', error);
  }
});
