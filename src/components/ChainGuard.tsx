import { useEffect, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { arcTestnet } from '@/lib/wagmi';
import toast from 'react-hot-toast';

const EXPECTED_CHAIN_ID = arcTestnet.id; // 5042002

interface ChainGuardProps {
  children: React.ReactNode;
  /** If true, blocks the entire UI when on wrong chain. If false, just shows a banner. */
  blocking?: boolean;
}

export function ChainGuard({ children, blocking = false }: ChainGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, isError, error } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);

  const isCorrectChain = !isConnected || chainId === EXPECTED_CHAIN_ID;

  // Reset dismissed state when chain changes
  useEffect(() => {
    if (isCorrectChain) {
      setDismissed(false);
    }
  }, [isCorrectChain]);

  // Show toast on switch error
  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to switch network. Please switch manually in your wallet.');
    }
  }, [isError, error]);

  const handleSwitch = () => {
    if (switchChain) {
      switchChain({ chainId: EXPECTED_CHAIN_ID });
    }
  };

  // If on correct chain or not connected, render children normally
  if (isCorrectChain) {
    return <>{children}</>;
  }

  // Non-blocking mode: show banner
  if (!blocking) {
    return (
      <>
        <AnimatePresence>
          {!dismissed && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600/95 to-orange-600/95 backdrop-blur-sm border-b border-red-500/50"
            >
              <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                  <div className="text-white">
                    <span className="font-semibold">Wrong Network:</span>{' '}
                    <span className="text-white/90">
                      Please switch to Arc Testnet (Chain ID: {EXPECTED_CHAIN_ID})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSwitch}
                    disabled={isPending}
                    size="sm"
                    className="bg-white text-red-600 hover:bg-white/90"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Switch Network
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setDismissed(true)}
                    size="sm"
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Add padding when banner is shown */}
        <div className={!dismissed ? 'pt-14' : ''}>
          {children}
        </div>
      </>
    );
  }

  // Blocking mode: full screen overlay
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-card border border-red-500/30 rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Wrong Network</h2>
            <p className="text-muted-foreground">
              This application requires Arc Testnet to function. 
              Please switch your wallet to the correct network.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Chain:</span>
              <span className="font-mono text-red-400">{chainId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Required Chain:</span>
              <span className="font-mono text-primary">{EXPECTED_CHAIN_ID}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network Name:</span>
              <span className="text-foreground">Arc Testnet</span>
            </div>
          </div>

          <Button
            onClick={handleSwitch}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Switching Network...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Switch to Arc Testnet
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            If auto-switch doesn't work, please add Arc Testnet manually in your wallet settings.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default ChainGuard;