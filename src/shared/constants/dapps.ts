// Arc Network dApps - REAL ecosystem protocols on Arc Testnet
export interface DApp {
  id: string;
  name: string;
  category: 'defi' | 'yield' | 'bridge' | 'infrastructure' | 'wallets' | 'exchanges';
  description: string;
  officialLink: string;
  allowedActions: string[];
}

// Quick Start presets that auto-select dApps and actions
export interface QuickStartPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  intentCategory: 'builder' | 'defi' | 'social' | 'infrastructure';
  dApps: string[];
  suggestedActions: string[];
  defaultTone: string;
}

export const QUICK_START_PRESETS: QuickStartPreset[] = [
  {
    id: 'defi-trading',
    label: 'DeFi Trading & Swaps',
    icon: '💱',
    description: 'Trade and swap tokens on Arc',
    intentCategory: 'defi',
    dApps: ['arcflow', 'aave'],
    suggestedActions: ['Connect wallet to ArcFlow Finance', 'Swap USDC to target token', 'Provide liquidity'],
    defaultTone: 'hype'
  },
  {
    id: 'lending',
    label: 'Lending & Borrowing',
    icon: '🏦',
    description: 'Lend and borrow on Arc protocols',
    intentCategory: 'defi',
    dApps: ['aave', 'maple', 'morpho'],
    suggestedActions: ['Connect wallet to Aave', 'Deposit USDC as collateral', 'Borrow against collateral'],
    defaultTone: 'professional'
  },
  {
    id: 'yield',
    label: 'Yield Strategies',
    icon: '📈',
    description: 'Optimize yield on Arc Network',
    intentCategory: 'defi',
    dApps: ['centrifuge', 'superform', 'securitize'],
    suggestedActions: ['Connect to yield protocol', 'Deposit stablecoins', 'Stake for yield rewards'],
    defaultTone: 'professional'
  },
  {
    id: 'bridging',
    label: 'Cross-Chain Bridging',
    icon: '🌉',
    description: 'Bridge assets to/from Arc',
    intentCategory: 'defi',
    dApps: ['across', 'stargate', 'wormhole'],
    suggestedActions: ['Connect wallet to bridge', 'Bridge USDC from source chain', 'Receive on Arc Network'],
    defaultTone: 'educational'
  },
  {
    id: 'building',
    label: 'Building Infrastructure',
    icon: '🛠️',
    description: 'Build and deploy on Arc',
    intentCategory: 'builder',
    dApps: ['alchemy', 'chainlink', 'thirdweb'],
    suggestedActions: ['Set up development environment', 'Deploy smart contract', 'Integrate oracle data'],
    defaultTone: 'technical'
  },
  {
    id: 'payments',
    label: 'Payment Integration',
    icon: '💳',
    description: 'Integrate Arc payments',
    intentCategory: 'infrastructure',
    dApps: ['arcflow', 'metamask', 'coinbase-wallet'],
    suggestedActions: ['Configure payment gateway', 'Process USDC transaction', 'Verify settlement'],
    defaultTone: 'professional'
  }
];

export const ARC_DAPPS: DApp[] = [
  // DeFi & Lending
  {
    id: 'arcflow',
    name: 'ArcFlow Finance',
    category: 'defi',
    description: 'Native DeFi hub for Arc Network',
    officialLink: 'https://arcflow.finance',
    allowedActions: ['deposit', 'withdraw', 'stake', 'unstake', 'claim_rewards', 'swap']
  },
  {
    id: 'aave',
    name: 'Aave',
    category: 'defi',
    description: 'Borrow, lend, earn with stablecoins',
    officialLink: 'https://aave.com',
    allowedActions: ['supply', 'borrow', 'repay', 'withdraw', 'stake']
  },
  {
    id: 'maple',
    name: 'Maple',
    category: 'defi',
    description: 'Institutional credit protocol',
    officialLink: 'https://maple.finance',
    allowedActions: ['lend', 'withdraw', 'claim_rewards']
  },
  {
    id: 'morpho',
    name: 'Morpho',
    category: 'defi',
    description: 'Lending optimizer protocol',
    officialLink: 'https://morpho.org',
    allowedActions: ['supply', 'borrow', 'withdraw', 'repay']
  },
  
  // Yield & Tokenized Assets
  {
    id: 'centrifuge',
    name: 'Centrifuge',
    category: 'yield',
    description: 'Real-world asset tokenization',
    officialLink: 'https://centrifuge.io',
    allowedActions: ['invest', 'redeem', 'claim_rewards']
  },
  {
    id: 'superform',
    name: 'Superform',
    category: 'yield',
    description: 'Cross-chain yield aggregator',
    officialLink: 'https://superform.xyz',
    allowedActions: ['deposit', 'withdraw', 'harvest']
  },
  {
    id: 'securitize',
    name: 'Securitize',
    category: 'yield',
    description: 'Tokenized securities platform',
    officialLink: 'https://securitize.io',
    allowedActions: ['invest', 'redeem', 'transfer']
  },
  {
    id: 'usyc',
    name: 'USYC (Circle)',
    category: 'yield',
    description: 'Yield-bearing stablecoin by Circle',
    officialLink: 'https://circle.com',
    allowedActions: ['mint', 'redeem', 'transfer']
  },
  
  // Cross-Chain Bridges
  {
    id: 'across',
    name: 'Across Protocol',
    category: 'bridge',
    description: 'Fast cross-chain USDC bridge',
    officialLink: 'https://across.to',
    allowedActions: ['bridge_in', 'bridge_out', 'claim']
  },
  {
    id: 'stargate',
    name: 'Stargate',
    category: 'bridge',
    description: 'LayerZero native bridge',
    officialLink: 'https://stargate.finance',
    allowedActions: ['bridge_in', 'bridge_out', 'add_liquidity']
  },
  {
    id: 'wormhole',
    name: 'Wormhole',
    category: 'bridge',
    description: 'Multi-chain messaging bridge',
    officialLink: 'https://wormhole.com',
    allowedActions: ['bridge_in', 'bridge_out', 'redeem']
  },
  
  // Infrastructure & Dev Tools
  {
    id: 'alchemy',
    name: 'Alchemy',
    category: 'infrastructure',
    description: 'Blockchain API platform',
    officialLink: 'https://alchemy.com',
    allowedActions: ['create_app', 'deploy_contract', 'monitor']
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    category: 'infrastructure',
    description: 'Decentralized oracle network',
    officialLink: 'https://chain.link',
    allowedActions: ['read_price', 'request_data', 'subscribe_feed']
  },
  {
    id: 'thirdweb',
    name: 'thirdweb',
    category: 'infrastructure',
    description: 'Web3 development platform',
    officialLink: 'https://thirdweb.com',
    allowedActions: ['deploy_contract', 'create_nft', 'build_dapp']
  },
  {
    id: 'blockdaemon',
    name: 'Blockdaemon',
    category: 'infrastructure',
    description: 'Node infrastructure provider',
    officialLink: 'https://blockdaemon.com',
    allowedActions: ['deploy_node', 'monitor', 'stake']
  },
  {
    id: 'blockscout',
    name: 'Blockscout',
    category: 'infrastructure',
    description: 'Arc Network explorer',
    officialLink: 'https://testnet.arcscan.app',
    allowedActions: ['verify_contract', 'explore', 'read_data']
  },
  
  // Wallets
  {
    id: 'metamask',
    name: 'MetaMask',
    category: 'wallets',
    description: 'Popular Web3 wallet',
    officialLink: 'https://metamask.io',
    allowedActions: ['connect', 'sign', 'send']
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    category: 'wallets',
    description: 'User-friendly Ethereum wallet',
    officialLink: 'https://rainbow.me',
    allowedActions: ['connect', 'sign', 'swap']
  },
  {
    id: 'privy',
    name: 'Privy',
    category: 'wallets',
    description: 'Embedded wallet infrastructure',
    officialLink: 'https://privy.io',
    allowedActions: ['create_wallet', 'authenticate', 'sign']
  },
  {
    id: 'coinbase-wallet',
    name: 'Coinbase Wallet',
    category: 'wallets',
    description: 'Self-custody crypto wallet',
    officialLink: 'https://wallet.coinbase.com',
    allowedActions: ['connect', 'sign', 'send']
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
  swap: { label: 'Swap', description: 'Swap tokens on DEX' },
  add_liquidity: { label: 'Add Liquidity', description: 'Provide liquidity to pool' },
  lend: { label: 'Lend', description: 'Lend assets for yield' },
  invest: { label: 'Invest', description: 'Invest in tokenized assets' },
  redeem: { label: 'Redeem', description: 'Redeem tokens for underlying' },
  harvest: { label: 'Harvest', description: 'Harvest yield from vault' },
  mint: { label: 'Mint', description: 'Mint new tokens' },
  transfer: { label: 'Transfer', description: 'Transfer assets' },
  
  // Bridge actions
  bridge_in: { label: 'Bridge In', description: 'Bridge assets to Arc Network' },
  bridge_out: { label: 'Bridge Out', description: 'Bridge assets from Arc Network' },
  claim: { label: 'Claim', description: 'Claim bridged assets' },
  
  // Infrastructure actions
  create_app: { label: 'Create App', description: 'Create new application' },
  deploy_contract: { label: 'Deploy Contract', description: 'Deploy smart contract' },
  monitor: { label: 'Monitor', description: 'Monitor application' },
  read_price: { label: 'Read Price', description: 'Read oracle price feed' },
  request_data: { label: 'Request Data', description: 'Request external data' },
  subscribe_feed: { label: 'Subscribe Feed', description: 'Subscribe to data feed' },
  create_nft: { label: 'Create NFT', description: 'Create NFT collection' },
  build_dapp: { label: 'Build dApp', description: 'Build decentralized app' },
  deploy_node: { label: 'Deploy Node', description: 'Deploy blockchain node' },
  verify_contract: { label: 'Verify Contract', description: 'Verify contract on explorer' },
  explore: { label: 'Explore', description: 'Explore blockchain data' },
  read_data: { label: 'Read Data', description: 'Read on-chain data' },
  
  // Wallet actions
  connect: { label: 'Connect Wallet', description: 'Connect wallet to dApp' },
  sign: { label: 'Sign', description: 'Sign message or transaction' },
  send: { label: 'Send', description: 'Send tokens' },
  create_wallet: { label: 'Create Wallet', description: 'Create new wallet' },
  authenticate: { label: 'Authenticate', description: 'Authenticate user' }
};

export function getDAppById(id: string): DApp | undefined {
  return ARC_DAPPS.find(dapp => dapp.id === id);
}

export function getDAppsByCategory(category: DApp['category']): DApp[] {
  return ARC_DAPPS.filter(dapp => dapp.category === category);
}

export function getQuickStartPreset(id: string): QuickStartPreset | undefined {
  return QUICK_START_PRESETS.find(preset => preset.id === id);
}
