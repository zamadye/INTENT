import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

// Arc Testnet chain definition
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

// Get WalletConnect Project ID from environment
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '32b25a62f2b25d5ec9b84507c6c80c73';

// Wagmi configuration
export const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    walletConnect({ 
      projectId,
      metadata: {
        name: 'Arc Campaign Engine',
        description: 'On-chain marketing & activity execution engine for Arc Network',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://arc-campaign.app',
        icons: ['https://arc.network/logo.png']
      },
      showQrModal: false, // We'll use Web3Modal instead
    }),
    injected({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Arc Campaign Engine',
    }),
  ],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
  },
});

// Initialize Web3Modal synchronously (required before hooks are called)
// This must happen at module load time to avoid race conditions with useWeb3Modal hook
if (typeof window !== 'undefined') {
  createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-color-mix': '#00D9FF',
      '--w3m-color-mix-strength': 20,
      '--w3m-accent': '#00D9FF',
      '--w3m-border-radius-master': '2px',
    },
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    ],
  });
}

// Kept for backwards compatibility (no-op now)
export const initWeb3Modal = () => {};

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
