import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const ARC_NETWORK_CONFIG = {
  chainId: '0x4cef52', // 5042002 in hex
  chainIdDecimal: 5042002,
  chainName: 'Arc Testnet',
  rpcUrls: ['https://rpc.testnet.arc.network'],
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  blockExplorerUrls: ['https://testnet.arcscan.app'],
};

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  truncatedAddress: string | null;
  balance: string;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0.0000');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const checkNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isCorrect = chainId === ARC_NETWORK_CONFIG.chainId;
      setIsCorrectNetwork(isCorrect);
      return isCorrect;
    } catch {
      return false;
    }
  }, []);

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(ARC_NETWORK_CONFIG.rpcUrls[0]);
      const bal = await provider.getBalance(addr);
      const formatted = ethers.formatEther(bal);
      setBalance(parseFloat(formatted).toFixed(4));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('0.0000');
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not found. Please install MetaMask to continue.', {
        duration: 5000,
        icon: '🦊',
      });
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);

    try {
      const result = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (result && result.length > 0) {
        const userAddress = result[0];
        setAddress(userAddress);
        setIsConnected(true);
        localStorage.setItem('walletConnected', 'true');

        const isCorrect = await checkNetwork();
        if (!isCorrect) {
          toast.error('Please switch to Arc Testnet', {
            duration: 4000,
            icon: '⚠️',
          });
        } else {
          await fetchBalance(userAddress);
          toast.success('Wallet connected successfully!', {
            icon: '🔗',
          });
        }
      }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4001) {
        toast.error('Connection cancelled by user');
      } else {
        toast.error('Failed to connect wallet');
        console.error('Connection error:', error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setBalance('0.0000');
    setIsCorrectNetwork(false);
    localStorage.removeItem('walletConnected');
    toast.success('Wallet disconnected');
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_NETWORK_CONFIG.chainId }],
      });
      toast.success('Switched to Arc Testnet');
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      // Chain not added yet
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: ARC_NETWORK_CONFIG.chainId,
                chainName: ARC_NETWORK_CONFIG.chainName,
                rpcUrls: ARC_NETWORK_CONFIG.rpcUrls,
                nativeCurrency: ARC_NETWORK_CONFIG.nativeCurrency,
                blockExplorerUrls: ARC_NETWORK_CONFIG.blockExplorerUrls,
              },
            ],
          });
          toast.success('Arc Testnet added and switched');
        } catch (addError) {
          toast.error('Failed to add Arc Testnet');
          console.error('Add network error:', addError);
        }
      } else {
        toast.error('Failed to switch network');
        console.error('Switch network error:', switchError);
      }
    }
  };

  // Auto-reconnect on mount
  useEffect(() => {
    const wasConnected = localStorage.getItem('walletConnected') === 'true';
    if (wasConnected && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((result: unknown) => {
          const accounts = result as string[];
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
            checkNetwork();
            fetchBalance(accounts[0]);
          }
        })
        .catch(console.error);
    }
  }, [checkNetwork, fetchBalance]);

  // Listen for account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      checkNetwork();
      if (address) fetchBalance(address);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [address, checkNetwork, fetchBalance]);

  // Refresh balance periodically
  useEffect(() => {
    if (!isConnected || !address || !isCorrectNetwork) return;

    const interval = setInterval(() => {
      fetchBalance(address);
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, address, isCorrectNetwork, fetchBalance]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        truncatedAddress,
        balance,
        isCorrectNetwork,
        isConnecting,
        connect,
        disconnect,
        switchNetwork,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
