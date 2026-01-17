import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Globe,
  Link2,
  Cpu,
  AlertTriangle,
  Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { arcTestnet } from '@/lib/wagmi';

const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
const EXPECTED_CHAIN_ID = 5042002;

interface DiagnosticResult {
  label: string;
  value: string;
  status: 'ok' | 'warning' | 'error' | 'loading';
  icon: React.ReactNode;
}

export default function WalletDiagnostics() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  
  const [rpcPingResult, setRpcPingResult] = useState<{ latency: number; success: boolean; error?: string } | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [blockNumber, setBlockNumber] = useState<string | null>(null);

  // Ping RPC endpoint
  const pingRpc = async () => {
    setIsPinging(true);
    setRpcPingResult(null);
    
    const startTime = performance.now();
    
    try {
      const response = await fetch(ARC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      if (!response.ok) {
        setRpcPingResult({ latency, success: false, error: `HTTP ${response.status}` });
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        setRpcPingResult({ latency, success: false, error: data.error.message });
        return;
      }
      
      const blockNum = parseInt(data.result, 16);
      setBlockNumber(blockNum.toLocaleString());
      setRpcPingResult({ latency, success: true });
      
    } catch (err) {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      setRpcPingResult({ 
        latency, 
        success: false, 
        error: err instanceof Error ? err.message : 'Connection failed' 
      });
    } finally {
      setIsPinging(false);
    }
  };

  // Auto-ping on mount
  useEffect(() => {
    pingRpc();
  }, []);

  const isCorrectChain = chainId === EXPECTED_CHAIN_ID;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'N/A';

  const diagnostics: DiagnosticResult[] = [
    {
      label: 'Current Origin',
      value: origin,
      status: origin.includes('app-intent.lovable.app') ? 'ok' : 'warning',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      label: 'Wallet Connected',
      value: isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not connected',
      status: isConnected ? 'ok' : 'warning',
      icon: <Link2 className="w-4 h-4" />,
    },
    {
      label: 'Connector',
      value: connector?.name || 'None',
      status: connector ? 'ok' : 'warning',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      label: 'Active Chain ID',
      value: chainId ? `${chainId} (0x${chainId.toString(16)})` : 'Unknown',
      status: isCorrectChain ? 'ok' : 'error',
      icon: isCorrectChain ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />,
    },
    {
      label: 'Expected Chain ID',
      value: `${EXPECTED_CHAIN_ID} (0x${EXPECTED_CHAIN_ID.toString(16)}) - Arc Testnet`,
      status: 'ok',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      label: 'RPC URL',
      value: ARC_RPC_URL,
      status: 'ok',
      icon: <Wifi className="w-4 h-4" />,
    },
    {
      label: 'RPC Ping',
      value: isPinging 
        ? 'Testing...' 
        : rpcPingResult 
          ? rpcPingResult.success 
            ? `${rpcPingResult.latency}ms - OK` 
            : `Failed: ${rpcPingResult.error}`
          : 'Not tested',
      status: isPinging ? 'loading' : rpcPingResult?.success ? 'ok' : rpcPingResult ? 'error' : 'warning',
      icon: isPinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />,
    },
    {
      label: 'Latest Block',
      value: blockNumber || 'Unknown',
      status: blockNumber ? 'ok' : 'warning',
      icon: <Cpu className="w-4 h-4" />,
    },
  ];

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok': return 'text-green-400 bg-green-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'error': return 'text-red-400 bg-red-400/10';
      case 'loading': return 'text-primary bg-primary/10';
    }
  };

  const handleSwitchNetwork = () => {
    if (switchChain) {
      switchChain({ chainId: EXPECTED_CHAIN_ID });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Wallet Safety Diagnostics
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Debug wallet connection issues and verify network configuration. 
              This page helps identify why wallets may show security warnings.
            </p>
          </div>

          {/* Chain Warning */}
          {isConnected && !isCorrectChain && (
            <Card className="border-red-500/50 bg-red-500/10">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <div>
                      <p className="font-semibold text-red-400">Wrong Network Detected</p>
                      <p className="text-sm text-muted-foreground">
                        You're on chain {chainId}. Please switch to Arc Testnet.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSwitchNetwork}
                    disabled={isSwitching}
                    variant="destructive"
                    size="sm"
                  >
                    {isSwitching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      'Switch to Arc Testnet'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnostics Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Connection Diagnostics</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={pingRpc}
                  disabled={isPinging}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isPinging ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Real-time diagnostics for your wallet connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {diagnostics.map((diag, index) => (
                <motion.div
                  key={diag.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(diag.status)}`}>
                      {diag.icon}
                    </div>
                    <span className="font-medium">{diag.label}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs ${getStatusColor(diag.status)}`}
                  >
                    {diag.value}
                  </Badge>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Wallet Trust Info */}
          <Card>
            <CardHeader>
              <CardTitle>Why Wallets Show Warnings</CardTitle>
              <CardDescription>
                Common reasons for security warnings from wallet extensions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">1. Unknown/Custom Networks</h4>
                <p>
                  Arc Testnet is a custom network not in default wallet lists. 
                  Wallets may warn when adding or switching to unknown chains.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">2. Domain Reputation</h4>
                <p>
                  New domains may not have established trust scores with wallet providers.
                  This improves over time with legitimate usage.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">3. SIWE (Sign-In With Ethereum)</h4>
                <p>
                  Signing messages for authentication is normal, but some wallets 
                  show warnings for all signature requests.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 mt-4">
                <p className="text-primary font-medium">
                  ✓ This site uses HTTPS, proper CSP headers, and verified WalletConnect metadata.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}