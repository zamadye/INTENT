// Arc Network Ecosystem - Comprehensive dApps Database
// 40+ verified applications from CONTEXT_DAPPS.md research

export enum DAppCategory {
  DEFI = 'DeFi Protocols',
  YIELD = 'Tokenized Assets & Yield',
  BRIDGE = 'Cross-Chain Bridges',
  WALLET = 'Wallets',
  INFRASTRUCTURE = 'Infrastructure & Dev Tools',
  EXCHANGE = 'Exchanges',
  LIQUIDITY = 'Market Makers & Liquidity',
  PAYMENT = 'Payments & Fintech',
  REGIONAL = 'Regional Stablecoins',
  ECOSYSTEM = 'Arc Ecosystem Native'
}

export interface ArcDApp {
  id: string;
  name: string;
  category: DAppCategory;
  type: string;
  description: string; // 200-400 chars for AI context
  useCases: string[];
  links: {
    main: string;
    app?: string;
    docs?: string;
    twitter?: string;
  };
  verified: boolean;
  featured: boolean;
}

export const arcDapps: ArcDApp[] = [
  // ============================================
  // CATEGORY 1: DEFI PROTOCOLS
  // ============================================
  {
    id: 'aave',
    name: 'Aave',
    category: DAppCategory.DEFI,
    type: 'Lending & Borrowing',
    description: 'Leading decentralized lending protocol enabling users to lend, borrow, and earn interest on crypto assets with algorithmic rates. Aave on Arc offers USDC-native lending with predictable gas fees and sub-second finality for instant loan confirmation and liquidation protection. Users can supply stablecoins to earn yield or borrow against collateral without traditional banks.',
    useCases: [
      'Supply USDC to earn passive yield',
      'Borrow stablecoins against crypto collateral',
      'Execute flash loans for arbitrage'
    ],
    links: {
      main: 'https://aave.com',
      app: 'https://app.aave.com',
      docs: 'https://docs.aave.com'
    },
    verified: true,
    featured: true
  },
  {
    id: 'maple',
    name: 'Maple Finance',
    category: DAppCategory.DEFI,
    type: 'Institutional Credit & Lending',
    description: 'Institutional-grade undercollateralized lending protocol connecting lenders with vetted borrowers. Maple on Arc enables credit markets for institutions using tokenized pools, providing transparent lending terms and automated repayment with USDC settlement. Designed for treasury management and institutional capital deployment.',
    useCases: [
      'Institutional lending pools',
      'Undercollateralized loans for verified entities',
      'Fixed-yield investment opportunities'
    ],
    links: {
      main: 'https://maple.finance',
      docs: 'https://docs.maple.finance'
    },
    verified: true,
    featured: false
  },
  {
    id: 'morpho',
    name: 'Morpho',
    category: DAppCategory.DEFI,
    type: 'Lending Optimizer',
    description: 'Peer-to-peer lending optimizer that improves rates on lending protocols like Aave and Compound. Morpho on Arc matches lenders and borrowers directly while maintaining liquidity pool safety, offering better yields for suppliers and lower rates for borrowers through efficient capital matching.',
    useCases: [
      'Enhanced lending yields',
      'Lower borrowing costs',
      'P2P-matched lending'
    ],
    links: {
      main: 'https://morpho.org',
      docs: 'https://docs.morpho.org'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 2: TOKENIZED ASSETS & YIELD
  // ============================================
  {
    id: 'centrifuge',
    name: 'Centrifuge',
    category: DAppCategory.YIELD,
    type: 'Real-World Asset (RWA) Tokenization',
    description: 'RWA tokenization protocol bringing real-world assets like invoices, mortgages, and trade finance onchain. Centrifuge on Arc enables institutions to tokenize assets, create liquidity pools, and offer yield opportunities backed by real economic activity with USDC settlement and compliance-ready infrastructure.',
    useCases: [
      'Tokenize real-world assets',
      'Invest in RWA-backed pools',
      'Institutional asset financing'
    ],
    links: {
      main: 'https://centrifuge.io',
      docs: 'https://docs.centrifuge.io'
    },
    verified: true,
    featured: true
  },
  {
    id: 'superform',
    name: 'Superform',
    category: DAppCategory.YIELD,
    type: 'Yield Aggregator',
    description: 'Cross-chain yield aggregator that discovers and routes capital to the best-yielding vaults across multiple chains. Superform on Arc automates yield farming by aggregating strategies from lending protocols, liquidity pools, and vaults, providing one-click access to optimized returns with USDC base currency.',
    useCases: [
      'Automated yield farming',
      'Cross-chain vault access',
      'Optimized return strategies'
    ],
    links: {
      main: 'https://superform.xyz',
      docs: 'https://docs.superform.xyz'
    },
    verified: true,
    featured: false
  },
  {
    id: 'securitize',
    name: 'Securitize',
    category: DAppCategory.YIELD,
    type: 'Digital Securities Platform',
    description: 'Regulated platform for issuing, managing, and trading tokenized securities including funds, bonds, and equity. Securitize on Arc enables compliant security token offerings with built-in privacy for institutional investors, KYC/AML integration, and automated dividend distribution via smart contracts.',
    useCases: [
      'Issue tokenized securities',
      'Trade regulated digital assets',
      'Automated compliance'
    ],
    links: {
      main: 'https://securitize.io',
      app: 'https://app.securitize.io'
    },
    verified: true,
    featured: false
  },
  {
    id: 'usyc',
    name: 'USYC (Circle Yield Coin)',
    category: DAppCategory.YIELD,
    type: 'Yield-Bearing Stablecoin',
    description: "Circle's yield-bearing token backed by short-term US Treasury bills, offering stable yield on USDC holdings. USYC on Arc provides institutional-grade treasury management, earning real-world yield onchain while maintaining USDC liquidity and compliance with traditional finance standards.",
    useCases: [
      'Earn treasury yield onchain',
      'Institutional cash management',
      'Liquidity with yield'
    ],
    links: {
      main: 'https://www.circle.com/en/usyc'
    },
    verified: true,
    featured: true
  },

  // ============================================
  // CATEGORY 3: CROSS-CHAIN BRIDGES
  // ============================================
  {
    id: 'across',
    name: 'Across Protocol',
    category: DAppCategory.BRIDGE,
    type: 'Fast Cross-Chain Bridge',
    description: 'Intent-based bridge powered by optimistic verification for instant cross-chain USDC transfers. Across on Arc enables users to bridge USDC from Ethereum, Arbitrum, Optimism and other chains to Arc in under 60 seconds with minimal fees, leveraging liquidity providers for instant settlement.',
    useCases: [
      'Bridge USDC to Arc Network from Ethereum',
      'Fast cross-chain transfers under 60 seconds',
      'Low-fee bridging with instant liquidity'
    ],
    links: {
      main: 'https://across.to',
      app: 'https://app.across.to',
      docs: 'https://docs.across.to'
    },
    verified: true,
    featured: true
  },
  {
    id: 'stargate',
    name: 'Stargate (LayerZero)',
    category: DAppCategory.BRIDGE,
    type: 'Omnichain Liquidity Protocol',
    description: 'Native asset bridge built on LayerZero enabling seamless USDC transfers across chains with unified liquidity. Stargate on Arc provides instant finality bridging with guaranteed liquidity and composable cross-chain applications through LayerZero messaging infrastructure.',
    useCases: [
      'Unified cross-chain liquidity',
      'Instant USDC bridging',
      'Cross-chain DeFi'
    ],
    links: {
      main: 'https://stargate.finance',
      app: 'https://app.stargate.finance',
      docs: 'https://stargateprotocol.gitbook.io'
    },
    verified: true,
    featured: false
  },
  {
    id: 'wormhole',
    name: 'Wormhole',
    category: DAppCategory.BRIDGE,
    type: 'Generic Messaging Bridge',
    description: 'Cross-chain messaging protocol supporting asset transfers, NFTs, and arbitrary data. Wormhole on Arc enables multi-chain applications to communicate with Arc, bringing assets from 30+ chains including Solana, Avalanche, and Ethereum to Arc\'s stablecoin-native environment.',
    useCases: [
      'Multi-chain asset bridging',
      'Cross-chain messaging',
      'NFT transfers'
    ],
    links: {
      main: 'https://wormhole.com',
      app: 'https://portalbridge.com',
      docs: 'https://docs.wormhole.com'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 4: WALLETS
  // ============================================
  {
    id: 'metamask',
    name: 'MetaMask',
    category: DAppCategory.WALLET,
    type: 'Browser & Mobile Wallet',
    description: 'Leading self-custody wallet with 30M+ users supporting Arc Network natively. MetaMask on Arc provides seamless onboarding with USDC gas fee display in dollars, hardware wallet integration, and dApp browser for interacting with Arc ecosystem applications.',
    useCases: [
      'Store USDC on Arc',
      'Connect to Arc dApps',
      'Sign transactions'
    ],
    links: {
      main: 'https://metamask.io',
      app: 'https://metamask.io/download',
      docs: 'https://docs.arc.network/arc/references/connect-to-arc'
    },
    verified: true,
    featured: true
  },
  {
    id: 'rainbow',
    name: 'Rainbow Wallet',
    category: DAppCategory.WALLET,
    type: 'Mobile-First Ethereum Wallet',
    description: 'Beautiful, user-friendly mobile wallet with NFT showcase and DeFi portfolio tracking. Rainbow on Arc offers simplified onboarding for Arc Network with USDC balance visualization, transaction history, and one-tap connection to Arc testnet dApps.',
    useCases: [
      'Mobile Arc wallet',
      'NFT management',
      'DeFi portfolio'
    ],
    links: {
      main: 'https://rainbow.me'
    },
    verified: true,
    featured: false
  },
  {
    id: 'privy',
    name: 'Privy',
    category: DAppCategory.WALLET,
    type: 'Embedded Wallet Solution',
    description: 'Developer-focused embedded wallet enabling email and social login for dApps. Privy on Arc allows applications to onboard users without crypto wallets, creating Arc wallets via email with built-in USDC faucet and recovery mechanisms for mainstream adoption.',
    useCases: [
      'Social login for dApps',
      'Embedded wallets',
      'Email-based Arc access'
    ],
    links: {
      main: 'https://privy.io',
      docs: 'https://docs.privy.io'
    },
    verified: true,
    featured: false
  },
  {
    id: 'coinbase-wallet',
    name: 'Coinbase Wallet',
    category: DAppCategory.WALLET,
    type: 'Self-Custody Wallet by Coinbase',
    description: 'Non-custodial wallet by Coinbase Exchange supporting Arc Network with direct fiat on-ramp. Coinbase Wallet on Arc enables users to buy USDC directly, transfer to Arc, and interact with Arc dApps while maintaining full key control separate from Coinbase exchange.',
    useCases: [
      'Self-custody on Arc',
      'Fiat to USDC on-ramp',
      'dApp connections'
    ],
    links: {
      main: 'https://wallet.coinbase.com',
      app: 'https://www.coinbase.com/wallet/downloads'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 5: INFRASTRUCTURE & DEVELOPER TOOLS
  // ============================================
  {
    id: 'alchemy',
    name: 'Alchemy',
    category: DAppCategory.INFRASTRUCTURE,
    type: 'Blockchain API & Node Infrastructure',
    description: 'Industry-leading blockchain API provider offering Arc RPC endpoints, enhanced APIs, and developer tools. Alchemy on Arc provides reliable node infrastructure, real-time webhooks, NFT APIs, and debugging tools for building production-grade Arc applications at scale.',
    useCases: [
      'Arc RPC access',
      'Real-time blockchain data',
      'Developer analytics'
    ],
    links: {
      main: 'https://www.alchemy.com',
      app: 'https://dashboard.alchemy.com',
      docs: 'https://docs.alchemy.com/reference/arc-api-quickstart'
    },
    verified: true,
    featured: true
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    category: DAppCategory.INFRASTRUCTURE,
    type: 'Decentralized Oracle Network',
    description: 'Leading oracle network providing real-world data to smart contracts. Chainlink on Arc delivers price feeds, proof of reserves, and external data for DeFi applications with cryptographic verification, enabling stablecoin price oracles and cross-chain interoperability.',
    useCases: [
      'Price feed oracles',
      'Proof of reserves',
      'External API data'
    ],
    links: {
      main: 'https://chain.link',
      app: 'https://data.chain.link',
      docs: 'https://docs.chain.link'
    },
    verified: true,
    featured: true
  },
  {
    id: 'thirdweb',
    name: 'thirdweb',
    category: DAppCategory.INFRASTRUCTURE,
    type: 'Web3 Development Platform',
    description: 'Complete web3 development platform with SDKs, smart contract templates, and deployment tools. thirdweb on Arc enables developers to build, deploy, and manage Arc applications using React, Node.js, Python with prebuilt contracts and wallet connection UI components.',
    useCases: [
      'Deploy Arc smart contracts',
      'Build Arc dApps',
      'Wallet integration'
    ],
    links: {
      main: 'https://thirdweb.com',
      app: 'https://thirdweb.com/dashboard'
    },
    verified: true,
    featured: false
  },
  {
    id: 'blockdaemon',
    name: 'Blockdaemon',
    category: DAppCategory.INFRASTRUCTURE,
    type: 'Enterprise Node Infrastructure',
    description: 'Institutional-grade node infrastructure provider supporting Arc validator nodes and RPC endpoints. Blockdaemon on Arc offers managed nodes, staking infrastructure, and enterprise SLAs for institutions building on Arc requiring 99.9% uptime and compliance support.',
    useCases: [
      'Managed Arc nodes',
      'Enterprise RPC',
      'Validator hosting'
    ],
    links: {
      main: 'https://www.blockdaemon.com',
      app: 'https://app.blockdaemon.com',
      docs: 'https://www.blockdaemon.com/protocols/arc'
    },
    verified: true,
    featured: false
  },
  {
    id: 'blockscout',
    name: 'Blockscout',
    category: DAppCategory.INFRASTRUCTURE,
    type: 'Blockchain Explorer',
    description: 'Official Arc Network block explorer for viewing transactions, contracts, and addresses. Blockscout on Arc provides real-time transaction tracking, smart contract verification, token analytics, and API access for Arc blockchain data with open-source transparency.',
    useCases: [
      'View Arc transactions',
      'Verify contracts',
      'Explore blocks'
    ],
    links: {
      main: 'https://testnet.arcscan.app',
      docs: 'https://testnet.arcscan.app/api-docs'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 6: EXCHANGES (CEX)
  // ============================================
  {
    id: 'coinbase',
    name: 'Coinbase',
    category: DAppCategory.EXCHANGE,
    type: 'Centralized Exchange',
    description: 'Largest US cryptocurrency exchange supporting USDC issuance and Arc ecosystem. Coinbase on Arc enables fiat on/off-ramp for Arc users, USDC deposits to Arc Network, and institutional custody with Coinbase Prime integration for treasury management.',
    useCases: [
      'Buy USDC for Arc',
      'Fiat on-ramp',
      'Institutional custody'
    ],
    links: {
      main: 'https://www.coinbase.com',
      app: 'https://pro.coinbase.com'
    },
    verified: true,
    featured: true
  },
  {
    id: 'kraken',
    name: 'Kraken',
    category: DAppCategory.EXCHANGE,
    type: 'Cryptocurrency Exchange',
    description: 'Global crypto exchange with advanced trading features and USDC support. Kraken on Arc provides liquidity for Arc-based assets, institutional OTC desk, and regulated custody services for enterprises building on Arc Network with compliance infrastructure.',
    useCases: [
      'Trade USDC',
      'Institutional OTC',
      'Regulated custody'
    ],
    links: {
      main: 'https://www.kraken.com',
      app: 'https://pro.kraken.com'
    },
    verified: true,
    featured: false
  },
  {
    id: 'bybit',
    name: 'ByBit',
    category: DAppCategory.EXCHANGE,
    type: 'Derivatives Exchange',
    description: 'Leading derivatives and spot exchange with high-volume USDC trading. ByBit on Arc enables perpetual futures, options, and spot trading for Arc ecosystem tokens with low fees and institutional-grade matching engine for high-frequency trading.',
    useCases: [
      'Derivatives trading',
      'Spot exchange',
      'High-volume trading'
    ],
    links: {
      main: 'https://www.bybit.com',
      app: 'https://www.bybit.com/trade'
    },
    verified: true,
    featured: false
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    category: DAppCategory.EXCHANGE,
    type: 'Retail Trading Platform',
    description: 'Commission-free trading platform bringing traditional finance users to crypto. Robinhood on Arc offers simple USDC trading, no-fee transactions, and Arc asset exposure for retail investors with intuitive mobile-first interface and instant deposits.',
    useCases: [
      'Retail USDC trading',
      'No-fee crypto access',
      'Mobile trading'
    ],
    links: {
      main: 'https://robinhood.com',
      app: 'https://robinhood.com/crypto'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 7: MARKET MAKERS & LIQUIDITY
  // ============================================
  {
    id: 'wintermute',
    name: 'Wintermute',
    category: DAppCategory.LIQUIDITY,
    type: 'Algorithmic Market Maker',
    description: 'Leading crypto market maker providing deep liquidity across CEX and DEX. Wintermute on Arc ensures liquid USDC markets, tight spreads, and 24/7 trading with algorithmic strategies optimized for stablecoin pairs and institutional block trades.',
    useCases: [
      'Deep liquidity provision',
      'Tight spreads',
      'Institutional trading'
    ],
    links: {
      main: 'https://www.wintermute.com'
    },
    verified: true,
    featured: false
  },
  {
    id: 'galaxy-digital',
    name: 'Galaxy Digital',
    category: DAppCategory.LIQUIDITY,
    type: 'Institutional Trading & Investment',
    description: 'Publicly-traded crypto financial services firm offering trading, investment, and advisory. Galaxy on Arc provides institutional liquidity, OTC trading desk, and treasury management services for Arc ecosystem participants with full regulatory compliance.',
    useCases: [
      'Institutional OTC',
      'Treasury management',
      'Investment services'
    ],
    links: {
      main: 'https://www.galaxydigital.io',
      app: 'https://www.galaxydigital.io/trading'
    },
    verified: true,
    featured: false
  },
  {
    id: 'gsr',
    name: 'GSR',
    category: DAppCategory.LIQUIDITY,
    type: 'Digital Asset Market Maker',
    description: 'Global market maker specializing in digital asset liquidity and derivatives. GSR on Arc delivers algorithmic market making, structured products, and risk management solutions for Arc-native tokens with enterprise-grade execution infrastructure.',
    useCases: [
      'Market making',
      'Derivatives',
      'Risk management'
    ],
    links: {
      main: 'https://www.gsr.io'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 8: PAYMENTS & FINTECH
  // ============================================
  {
    id: 'arcflow-finance',
    name: 'ArcFlow Finance',
    category: DAppCategory.PAYMENT,
    type: 'Native DeFi Protocol on Arc',
    description: "Arc Network's flagship DeFi protocol offering decentralized exchange, liquidity pools, and stablecoin swaps optimized for Arc's USDC-native infrastructure. ArcFlow enables instant USDC swaps, yield farming, and liquidity provision with predictable gas fees and sub-second settlement powered by Arc's built-in StableFX engine.",
    useCases: [
      'Swap USDC/EURC instantly',
      'Provide liquidity and earn fees',
      'Yield farming with stablecoins'
    ],
    links: {
      main: 'https://arcflow.finance',
      twitter: '@ArcFlowFinance'
    },
    verified: true,
    featured: true
  },
  {
    id: 'circle-cpn',
    name: 'Circle Payments Network (CPN)',
    category: DAppCategory.PAYMENT,
    type: 'Institutional Payment Infrastructure',
    description: "Circle's institutional payment network enabling programmable USDC transfers for businesses. CPN on Arc allows enterprises to send cross-border payments instantly with API integration, automated compliance, and settlement finality for B2B and payroll use cases.",
    useCases: [
      'B2B payments',
      'Cross-border transfers',
      'Payroll automation'
    ],
    links: {
      main: 'https://www.circle.com/en/payments'
    },
    verified: true,
    featured: false
  },

  // ============================================
  // CATEGORY 9: REGIONAL STABLECOINS
  // ============================================
  {
    id: 'phpc',
    name: 'Coins.ph (PHPC)',
    category: DAppCategory.REGIONAL,
    type: 'Philippine Peso Stablecoin',
    description: 'Leading Filipino fintech exploring PHPC stablecoin on Arc for remittances. PHPC on Arc enables Filipinos to send peso-backed stablecoins instantly to Arc Network with local on/off-ramps, reducing overseas worker remittance costs and settlement time from days to seconds.',
    useCases: [
      'PHP remittances',
      'Local stablecoin',
      'Peso savings'
    ],
    links: {
      main: 'https://coins.ph'
    },
    verified: false,
    featured: false
  },
  {
    id: 'forte-aud',
    name: 'Forte (AUD)',
    category: DAppCategory.REGIONAL,
    type: 'Australian Dollar Stablecoin',
    description: "Regional stablecoin issuer exploring Arc's multi-currency infrastructure. Forte plans to launch AUD stablecoins on Arc, enabling local currency on/off-ramps and FX swaps via Arc's built-in StableFX engine for cross-border payments and local DeFi.",
    useCases: [
      'AUD stablecoin',
      'Regional FX',
      'Australian payments'
    ],
    links: {
      main: 'https://forte.io'
    },
    verified: false,
    featured: false
  },
  {
    id: 'avenia-brl',
    name: 'Avenia (BRL)',
    category: DAppCategory.REGIONAL,
    type: 'Brazilian Real Stablecoin',
    description: "Regional stablecoin issuer for Brazilian Real on Arc Network. Avenia plans to launch BRL stablecoins enabling local currency on/off-ramps and FX swaps via Arc's built-in StableFX engine for cross-border payments and local DeFi in Brazil.",
    useCases: [
      'BRL stablecoin',
      'Regional FX',
      'Brazilian payments'
    ],
    links: {
      main: 'https://avenia.io'
    },
    verified: false,
    featured: false
  },
  {
    id: 'juno-mxn',
    name: 'Juno (MXN)',
    category: DAppCategory.REGIONAL,
    type: 'Mexican Peso Stablecoin',
    description: "Regional stablecoin issuer for Mexican Peso on Arc Network. Juno plans to launch MXN stablecoins enabling local currency on/off-ramps and FX swaps via Arc's built-in StableFX engine for cross-border payments and remittances to Mexico.",
    useCases: [
      'MXN stablecoin',
      'Regional FX',
      'Mexican remittances'
    ],
    links: {
      main: 'https://juno.finance'
    },
    verified: false,
    featured: false
  },

  // ============================================
  // CATEGORY 10: ARC ECOSYSTEM NATIVE
  // ============================================
  {
    id: 'arc-index',
    name: 'Arc Index',
    category: DAppCategory.ECOSYSTEM,
    type: 'Project Directory & Certification',
    description: 'Curated project directory for Arc Network with NFT certification for approved projects. Arc Index connects builders with the Arc community through quality-vetted listings, USDC funding mechanism, and community ratings for discovering legitimate Arc ecosystem projects.',
    useCases: [
      'Discover Arc projects',
      'Submit projects for approval',
      'Fund Arc builders'
    ],
    links: {
      main: 'https://arcindex.xyz',
      app: 'https://arcindex.xyz/explore'
    },
    verified: true,
    featured: false
  },
  {
    id: 'easy-faucet-arc',
    name: 'Easy Faucet Arc',
    category: DAppCategory.ECOSYSTEM,
    type: 'Arc Testnet Faucet',
    description: 'Community-built testnet faucet distributing free USDC on Arc testnet for developers and testers. Provides daily USDC allotments for gas fees, enabling new users to experiment with Arc applications without real funds while preventing abuse through rate limiting.',
    useCases: [
      'Get testnet USDC',
      'Test Arc dApps',
      'Developer onboarding'
    ],
    links: {
      main: 'https://easyfaucetarc.xyz',
      docs: 'https://faucet.circle.com'
    },
    verified: true,
    featured: false
  }
];

// Helper functions
export function getDAppById(id: string): ArcDApp | undefined {
  return arcDapps.find(dapp => dapp.id === id);
}

export function getDAppsByCategory(category: DAppCategory): ArcDApp[] {
  return arcDapps.filter(dapp => dapp.category === category);
}

export function getFeaturedDapps(): ArcDApp[] {
  return arcDapps.filter(dapp => dapp.featured);
}

export function getVerifiedDapps(): ArcDApp[] {
  return arcDapps.filter(dapp => dapp.verified);
}

export const dAppsByCategory: Record<DAppCategory, ArcDApp[]> = {
  [DAppCategory.DEFI]: getDAppsByCategory(DAppCategory.DEFI),
  [DAppCategory.YIELD]: getDAppsByCategory(DAppCategory.YIELD),
  [DAppCategory.BRIDGE]: getDAppsByCategory(DAppCategory.BRIDGE),
  [DAppCategory.WALLET]: getDAppsByCategory(DAppCategory.WALLET),
  [DAppCategory.INFRASTRUCTURE]: getDAppsByCategory(DAppCategory.INFRASTRUCTURE),
  [DAppCategory.EXCHANGE]: getDAppsByCategory(DAppCategory.EXCHANGE),
  [DAppCategory.LIQUIDITY]: getDAppsByCategory(DAppCategory.LIQUIDITY),
  [DAppCategory.PAYMENT]: getDAppsByCategory(DAppCategory.PAYMENT),
  [DAppCategory.REGIONAL]: getDAppsByCategory(DAppCategory.REGIONAL),
  [DAppCategory.ECOSYSTEM]: getDAppsByCategory(DAppCategory.ECOSYSTEM),
};

// Quick Start Presets using new dApp IDs
export interface QuickStartPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  category: string;
  dAppIds: string[];
  suggestedActions: string[];
  defaultTone: 'professional' | 'hype' | 'educational' | 'technical' | 'degen';
  twitterMaxLength: number;
}

export const QUICK_START_PRESETS: QuickStartPreset[] = [
  {
    id: 'swap-trade-arcflow',
    label: 'Swap & Trade on ArcFlow',
    icon: '💱',
    description: 'Trading and swapping on ArcFlow Finance DEX',
    category: 'DeFi',
    dAppIds: ['arcflow-finance', 'aave'],
    suggestedActions: [
      'Connect wallet to ArcFlow Finance',
      'Swap USDC to target token',
      'Provide liquidity or stake'
    ],
    defaultTone: 'hype',
    twitterMaxLength: 280
  },
  {
    id: 'lend-aave',
    label: 'Lend & Earn with Aave',
    icon: '🏦',
    description: 'Lending and borrowing on Aave protocol',
    category: 'DeFi',
    dAppIds: ['aave', 'arcflow-finance'],
    suggestedActions: [
      'Connect wallet to Aave',
      'Supply USDC as collateral',
      'Borrow stablecoins or earn yield'
    ],
    defaultTone: 'professional',
    twitterMaxLength: 280
  },
  {
    id: 'bridge-usdc',
    label: 'Bridge USDC to Arc',
    icon: '🌉',
    description: 'Bridge USDC from other chains to Arc Network',
    category: 'Bridge',
    dAppIds: ['across', 'stargate', 'arcflow-finance'],
    suggestedActions: [
      'Connect wallet to Across Protocol',
      'Bridge USDC from source chain',
      'Swap on ArcFlow Finance'
    ],
    defaultTone: 'educational',
    twitterMaxLength: 280
  },
  {
    id: 'yield-farming',
    label: 'Yield Farming Setup',
    icon: '🌾',
    description: 'Set up yield strategies on Arc Network',
    category: 'Yield',
    dAppIds: ['superform', 'centrifuge', 'arcflow-finance'],
    suggestedActions: [
      'Connect to yield protocol',
      'Deposit stablecoins',
      'Stake for yield rewards'
    ],
    defaultTone: 'professional',
    twitterMaxLength: 280
  },
  {
    id: 'payment-integration',
    label: 'Payment Integration',
    icon: '💳',
    description: 'Integrate Arc payments and USDC transfers',
    category: 'Payment',
    dAppIds: ['arcflow-finance', 'circle-cpn', 'metamask'],
    suggestedActions: [
      'Configure payment gateway',
      'Process USDC transaction',
      'Verify settlement'
    ],
    defaultTone: 'professional',
    twitterMaxLength: 280
  },
  {
    id: 'cross-chain-defi',
    label: 'Cross-Chain DeFi',
    icon: '🔗',
    description: 'Multi-chain DeFi strategies on Arc',
    category: 'DeFi',
    dAppIds: ['wormhole', 'aave', 'arcflow-finance'],
    suggestedActions: [
      'Bridge assets via Wormhole',
      'Deposit on Aave',
      'Swap on ArcFlow Finance'
    ],
    defaultTone: 'hype',
    twitterMaxLength: 280
  },
  {
    id: 'build-dev-tools',
    label: 'Build with Dev Tools',
    icon: '🛠️',
    description: 'Build and deploy on Arc Network',
    category: 'Infrastructure',
    dAppIds: ['alchemy', 'thirdweb', 'chainlink'],
    suggestedActions: [
      'Set up development environment',
      'Deploy smart contract',
      'Integrate oracle data'
    ],
    defaultTone: 'technical',
    twitterMaxLength: 280
  },
  {
    id: 'custom-selection',
    label: 'Custom Selection',
    icon: '⚙️',
    description: 'Choose your own dApps and actions',
    category: 'Custom',
    dAppIds: [],
    suggestedActions: [],
    defaultTone: 'professional',
    twitterMaxLength: 280
  }
];

export function getQuickStartPreset(id: string): QuickStartPreset | undefined {
  return QUICK_START_PRESETS.find(preset => preset.id === id);
}

export function getDAppsForPreset(presetId: string): ArcDApp[] {
  const preset = getQuickStartPreset(presetId);
  if (!preset) return [];
  return preset.dAppIds.map(id => getDAppById(id)).filter((d): d is ArcDApp => d !== undefined);
}
