import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Event Listener Worker
 * 
 * Reads on-chain events from Arc Network and syncs campaign status deterministically.
 * Events: CampaignRegistered, ProofRecorded
 * 
 * This is a background worker that can be triggered via cron or manually.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Arc Network Testnet RPC
const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network';
const ARC_CHAIN_ID = 1147;

// Contract addresses (to be updated after deployment)
const CAMPAIGN_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder
const INTENT_PROOF_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder

// Event signatures (keccak256 hashes)
const EVENT_SIGNATURES = {
  CampaignRegistered: '0x' + 'CampaignRegistered(bytes32,address,uint256)'.split('').reduce((a, b) => a + b.charCodeAt(0).toString(16), ''), // Placeholder - compute actual
  ProofRecorded: '0x' + 'ProofRecorded(uint256,address,bytes32,uint256)'.split('').reduce((a, b) => a + b.charCodeAt(0).toString(16), ''), // Placeholder
};

// Actual event topic hashes (keccak256)
// CampaignRegistered(bytes32 indexed campaignHash, address indexed creator, uint256 registeredAt)
const CAMPAIGN_REGISTERED_TOPIC = '0x7a26e3c4a7f2f2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2'; // Placeholder

// ProofRecorded(uint256 indexed proofId, address indexed user, bytes32 indexed campaignHash, uint256 timestamp)
const PROOF_RECORDED_TOPIC = '0x8b36e3c4a7f2f2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2'; // Placeholder

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  blockHash: string;
  logIndex: string;
}

interface BlockInfo {
  number: string;
  timestamp: string;
}

/**
 * Make RPC call to Arc Network
 */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(ARC_TESTNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  const data: RpcResponse = await response.json();
  
  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }
  
  return data.result;
}

/**
 * Get latest block number
 */
async function getLatestBlockNumber(): Promise<number> {
  const result = await rpcCall('eth_blockNumber', []);
  return parseInt(result as string, 16);
}

/**
 * Get block info
 */
async function getBlockInfo(blockNumber: number): Promise<BlockInfo> {
  const result = await rpcCall('eth_getBlockByNumber', [
    '0x' + blockNumber.toString(16),
    false,
  ]);
  return result as BlockInfo;
}

/**
 * Get logs for a specific contract and topics
 */
async function getLogs(
  contractAddress: string,
  fromBlock: number,
  toBlock: number,
  topics: (string | null)[]
): Promise<Log[]> {
  const result = await rpcCall('eth_getLogs', [{
    address: contractAddress,
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + toBlock.toString(16),
    topics,
  }]);
  return (result as Log[]) || [];
}

/**
 * Parse CampaignRegistered event
 */
function parseCampaignRegisteredEvent(log: Log): {
  campaignHash: string;
  creator: string;
  registeredAt: number;
  txHash: string;
} {
  // Indexed params are in topics[1], topics[2], etc.
  const campaignHash = log.topics[1]; // bytes32 indexed
  const creator = '0x' + log.topics[2].slice(26); // address indexed (remove padding)
  
  // Non-indexed params are in data
  const registeredAt = parseInt(log.data.slice(0, 66), 16);
  
  return {
    campaignHash,
    creator: creator.toLowerCase(),
    registeredAt,
    txHash: log.transactionHash,
  };
}

/**
 * Parse ProofRecorded event
 */
function parseProofRecordedEvent(log: Log): {
  proofId: number;
  user: string;
  campaignHash: string;
  timestamp: number;
  txHash: string;
} {
  const proofId = parseInt(log.topics[1], 16); // uint256 indexed
  const user = '0x' + log.topics[2].slice(26); // address indexed
  const campaignHash = log.topics[3]; // bytes32 indexed
  
  const timestamp = parseInt(log.data.slice(0, 66), 16);
  
  return {
    proofId,
    user: user.toLowerCase(),
    campaignHash,
    timestamp,
    txHash: log.transactionHash,
  };
}

/**
 * Safe error helper - logs detailed error internally, returns generic message
 */
function safeError(status: number, publicMessage: string, internalError?: unknown): Response {
  if (internalError) {
    console.error(`[EventListener] Internal error: ${publicMessage}`, internalError);
  }
  return new Response(
    JSON.stringify({ error: publicMessage }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Rate limiting for DoS protection (in-memory, resets on cold start)
const lastSyncTime = { global: 0 };
const SYNC_COOLDOWN_MS = 60000; // 1 minute between syncs

// Maximum blocks to prevent expensive RPC calls
const MAX_BLOCKS = 10000;
const DEFAULT_BLOCKS = 1000;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return safeError(500, 'Server configuration error');
    }

    // SECURITY: Require service role authentication
    // This endpoint should only be called by cron jobs or internal services
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      console.warn('[EventListener] Unauthorized access attempt');
      return safeError(401, 'Authentication required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'sync';

    console.log(`[EventListener] Action: ${action}`);

    switch (action) {
      case 'sync': {
        // Rate limiting check
        const now = Date.now();
        if (lastSyncTime.global && now - lastSyncTime.global < SYNC_COOLDOWN_MS) {
          const waitTime = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSyncTime.global)) / 1000);
          return safeError(429, `Rate limit exceeded. Try again in ${waitTime} seconds.`);
        }
        lastSyncTime.global = now;

        // Validate and parse blocks parameter
        const blocksParam = url.searchParams.get('blocks') || String(DEFAULT_BLOCKS);
        const blocksToSync = parseInt(blocksParam, 10);
        
        // Input validation
        if (isNaN(blocksToSync)) {
          return safeError(400, 'Invalid blocks parameter - must be a number');
        }
        if (blocksToSync < 1 || blocksToSync > MAX_BLOCKS) {
          return safeError(400, `Blocks parameter must be between 1 and ${MAX_BLOCKS}`);
        }
        
        const latestBlock = await getLatestBlockNumber();
        const fromBlock = Math.max(0, latestBlock - blocksToSync);
        
        console.log(`[EventListener] Syncing blocks ${fromBlock} to ${latestBlock}`);

        const results = {
          campaignEvents: 0,
          proofEvents: 0,
          errors: [] as string[],
        };

        // Skip if contracts not deployed (placeholder addresses)
        if (CAMPAIGN_REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') {
          console.log('[EventListener] Campaign Registry not deployed yet, skipping...');
          return new Response(JSON.stringify({
            success: true,
            message: 'Contracts not deployed yet. Sync skipped.',
            latestBlock,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch CampaignRegistered events
        try {
          const campaignLogs = await getLogs(
            CAMPAIGN_REGISTRY_ADDRESS,
            fromBlock,
            latestBlock,
            [CAMPAIGN_REGISTERED_TOPIC]
          );

          for (const log of campaignLogs) {
            try {
              const event = parseCampaignRegisteredEvent(log);
              console.log(`[EventListener] CampaignRegistered: ${event.campaignHash}`);

              // Find campaign in DB by caption_hash and update with on-chain reference
              const { error: updateError } = await supabase
                .from('campaigns')
                .update({
                  status: 'finalized',
                  // We could add an onchain_campaign_id column later
                })
                .eq('caption_hash', event.campaignHash)
                .eq('wallet_address', event.creator);

              if (!updateError) {
                results.campaignEvents++;
              }
            } catch (parseError) {
              results.errors.push(`Failed to parse campaign event: ${parseError}`);
            }
          }
        } catch (logError) {
          results.errors.push(`Failed to fetch campaign logs: ${logError}`);
        }

        // Fetch ProofRecorded events
        try {
          const proofLogs = await getLogs(
            INTENT_PROOF_ADDRESS,
            fromBlock,
            latestBlock,
            [PROOF_RECORDED_TOPIC]
          );

          for (const log of proofLogs) {
            try {
              const event = parseProofRecordedEvent(log);
              console.log(`[EventListener] ProofRecorded: ${event.proofId} for ${event.user}`);

              // Update proof in DB with on-chain confirmation
              const { error: updateError } = await supabase
                .from('nfts')
                .update({
                  status: 'minted',
                  token_id: event.proofId.toString(),
                  tx_hash: event.txHash,
                  verified_at: new Date(event.timestamp * 1000).toISOString(),
                })
                .eq('wallet_address', event.user)
                .eq('intent_fingerprint', event.campaignHash);

              if (!updateError) {
                results.proofEvents++;
              }
            } catch (parseError) {
              results.errors.push(`Failed to parse proof event: ${parseError}`);
            }
          }
        } catch (logError) {
          results.errors.push(`Failed to fetch proof logs: ${logError}`);
        }

        console.log(`[EventListener] Sync complete: ${results.campaignEvents} campaigns, ${results.proofEvents} proofs`);

        return new Response(JSON.stringify({
          success: true,
          latestBlock,
          fromBlock,
          ...results,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        // Health check and current sync status
        const latestBlock = await getLatestBlockNumber();
        const blockInfo = await getBlockInfo(latestBlock);
        
        return new Response(JSON.stringify({
          success: true,
          chainId: ARC_CHAIN_ID,
          rpc: ARC_TESTNET_RPC,
          latestBlock,
          blockTimestamp: parseInt(blockInfo.timestamp, 16),
          contracts: {
            campaignRegistry: CAMPAIGN_REGISTRY_ADDRESS,
            intentProof: INTENT_PROOF_ADDRESS,
            deployed: CAMPAIGN_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000',
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'test-rpc': {
        // Test RPC connectivity
        const latestBlock = await getLatestBlockNumber();
        const blockInfo = await getBlockInfo(latestBlock);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'RPC connection successful',
          latestBlock,
          blockTime: new Date(parseInt(blockInfo.timestamp, 16) * 1000).toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return safeError(400, `Unknown action: ${action}`);
    }
  } catch (error) {
    return safeError(500, 'Event listener error', error);
  }
});
