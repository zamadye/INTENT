// Arc Network dApps for campaign targeting
export interface DApp {
  id: string;
  name: string;
  category: 'defi' | 'bridge' | 'trading' | 'infrastructure' | 'social' | 'payments';
  description: string;
  officialLink: string;
  allowedActions: string[];
}

export const ARC_DAPPS: DApp[] = [
  {
    id: 'arcflow',
    name: 'ArcFlow Finance',
    category: 'defi',
    description: 'Native DeFi hub for Arc Network with lending, borrowing, and yield optimization',
    officialLink: 'https://arcflow.finance',
    allowedActions: ['deposit', 'withdraw', 'stake', 'unstake', 'claim_rewards', 'borrow', 'repay']
  },
  {
    id: 'arc-bridge',
    name: 'Arc Bridge',
    category: 'bridge',
    description: 'Official bridge for moving assets between Ethereum and Arc Network',
    officialLink: 'https://bridge.arc.network',
    allowedActions: ['bridge_in', 'bridge_out', 'claim_bridged']
  },
  {
    id: 'arc-swap',
    name: 'Arc Swap',
    category: 'trading',
    description: 'Native DEX for token swaps with concentrated liquidity',
    officialLink: 'https://swap.arc.network',
    allowedActions: ['swap', 'add_liquidity', 'remove_liquidity', 'collect_fees']
  },
  {
    id: 'arc-lend',
    name: 'Arc Lend',
    category: 'defi',
    description: 'Lending protocol optimized for stablecoin borrowing',
    officialLink: 'https://lend.arc.network',
    allowedActions: ['supply', 'withdraw', 'borrow', 'repay', 'liquidate']
  },
  {
    id: 'arc-pay',
    name: 'Arc Pay',
    category: 'payments',
    description: 'Payment rails for B2B and cross-border transactions',
    officialLink: 'https://pay.arc.network',
    allowedActions: ['send_payment', 'receive_payment', 'create_invoice', 'batch_payment']
  },
  {
    id: 'arc-vault',
    name: 'Arc Vault',
    category: 'defi',
    description: 'Yield aggregator and vault strategies for optimized returns',
    officialLink: 'https://vault.arc.network',
    allowedActions: ['deposit', 'withdraw', 'harvest', 'compound']
  },
  {
    id: 'arc-nft',
    name: 'Arc NFT',
    category: 'infrastructure',
    description: 'NFT infrastructure for proof-of-participation and credentials',
    officialLink: 'https://nft.arc.network',
    allowedActions: ['mint', 'transfer', 'burn', 'list', 'delist']
  },
  {
    id: 'chainlink-oracle',
    name: 'Chainlink Oracle',
    category: 'infrastructure',
    description: 'Decentralized oracle network for price feeds and external data',
    officialLink: 'https://chain.link',
    allowedActions: ['read_price', 'subscribe_feed']
  }
];

export const DAPP_ACTIONS: Record<string, { label: string; description: string }> = {
  // DeFi actions
  deposit: { label: 'Deposit', description: 'Deposit assets into protocol' },
  withdraw: { label: 'Withdraw', description: 'Withdraw assets from protocol' },
  stake: { label: 'Stake', description: 'Stake tokens for rewards' },
  unstake: { label: 'Unstake', description: 'Unstake tokens' },
  claim_rewards: { label: 'Claim Rewards', description: 'Claim earned rewards' },
  borrow: { label: 'Borrow', description: 'Borrow assets against collateral' },
  repay: { label: 'Repay', description: 'Repay borrowed assets' },
  supply: { label: 'Supply', description: 'Supply assets to lending pool' },
  liquidate: { label: 'Liquidate', description: 'Liquidate undercollateralized position' },
  
  // Trading actions
  swap: { label: 'Swap', description: 'Swap tokens on DEX' },
  add_liquidity: { label: 'Add Liquidity', description: 'Provide liquidity to pool' },
  remove_liquidity: { label: 'Remove Liquidity', description: 'Remove liquidity from pool' },
  collect_fees: { label: 'Collect Fees', description: 'Collect earned trading fees' },
  
  // Bridge actions
  bridge_in: { label: 'Bridge In', description: 'Bridge assets to Arc Network' },
  bridge_out: { label: 'Bridge Out', description: 'Bridge assets from Arc Network' },
  claim_bridged: { label: 'Claim Bridged', description: 'Claim bridged assets' },
  
  // Payment actions
  send_payment: { label: 'Send Payment', description: 'Send USDC payment' },
  receive_payment: { label: 'Receive Payment', description: 'Receive USDC payment' },
  create_invoice: { label: 'Create Invoice', description: 'Create payment invoice' },
  batch_payment: { label: 'Batch Payment', description: 'Send multiple payments' },
  
  // Vault actions
  harvest: { label: 'Harvest', description: 'Harvest yield from vault' },
  compound: { label: 'Compound', description: 'Compound rewards back into vault' },
  
  // NFT actions
  mint: { label: 'Mint', description: 'Mint new NFT' },
  transfer: { label: 'Transfer', description: 'Transfer NFT to another address' },
  burn: { label: 'Burn', description: 'Burn NFT permanently' },
  list: { label: 'List', description: 'List NFT for sale' },
  delist: { label: 'Delist', description: 'Remove NFT from sale' },
  
  // Infrastructure actions
  read_price: { label: 'Read Price', description: 'Read oracle price feed' },
  subscribe_feed: { label: 'Subscribe Feed', description: 'Subscribe to price updates' }
};

export function getDAppById(id: string): DApp | undefined {
  return ARC_DAPPS.find(dapp => dapp.id === id);
}

export function getDAppsByCategory(category: DApp['category']): DApp[] {
  return ARC_DAPPS.filter(dapp => dapp.category === category);
}
