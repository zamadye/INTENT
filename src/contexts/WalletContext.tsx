import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAccount, useBalance, useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { formatUnits } from 'viem';
import toast from 'react-hot-toast';
import { arcTestnet } from '@/lib/wagmi';

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
  const { address, isConnected, isConnecting: wagmiConnecting } = useAccount();
  const chainId = useChainId();
  const { open } = useWeb3Modal();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  const { data: balanceData } = useBalance({
    address: address,
    chainId: arcTestnet.id,
  });

  const isCorrectNetwork = chainId === arcTestnet.id;
  
  // Format balance using viem's formatUnits
  const balance = balanceData 
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(4) 
    : '0.0000';

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const connect = async () => {
    try {
      await open();
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const disconnect = () => {
    wagmiDisconnect();
    toast.success('Wallet disconnected');
  };

  const switchNetworkHandler = async () => {
    try {
      switchChain({ chainId: arcTestnet.id });
      toast.success('Switched to Arc Testnet');
    } catch (error) {
      console.error('Switch network error:', error);
      toast.error('Failed to switch network');
    }
  };

  // Show toast when connected to wrong network
  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      toast.error('Please switch to Arc Testnet', {
        duration: 4000,
        icon: '⚠️',
      });
    }
  }, [isConnected, isCorrectNetwork]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address: address || null,
        truncatedAddress,
        balance,
        isCorrectNetwork,
        isConnecting: wagmiConnecting,
        connect,
        disconnect,
        switchNetwork: switchNetworkHandler,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
