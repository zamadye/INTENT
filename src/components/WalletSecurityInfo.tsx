import React from 'react';
import { Shield, Wallet, FileSignature, AlertTriangle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WalletSecurityInfoProps {
  trigger?: React.ReactNode;
}

/**
 * Wallet Security Information Component
 * 
 * Displays comprehensive security information about how INTENT
 * handles wallet connections and signatures. This helps build trust
 * and reduces phishing detection false positives.
 */
export const WalletSecurityInfo: React.FC<WalletSecurityInfoProps> = ({ trigger }) => {
  const securityPoints = [
    {
      icon: Wallet,
      title: 'Wallet Connection Only',
      description: 'We connect via WalletConnect/MetaMask. We never ask for or have access to your seed phrase or private keys.',
      status: 'safe',
    },
    {
      icon: FileSignature,
      title: 'Transparent Signatures',
      description: 'All signature requests show the exact message content. We use SIWE (Sign-In With Ethereum) for authentication.',
      status: 'safe',
    },
    {
      icon: Shield,
      title: 'No Token Approvals',
      description: 'INTENT Proofs are free to mint (gas only). We never request unlimited token spending approvals.',
      status: 'safe',
    },
    {
      icon: Check,
      title: 'Transaction Previews',
      description: 'All blockchain transactions show exact actions before signing. No hidden transfers or contract calls.',
      status: 'safe',
    },
  ];

  const warningPoints = [
    'NEVER share your seed phrase with anyone, including INTENT',
    'INTENT will NEVER ask for your private keys',
    'Always verify you are on app-intent.lovable.app',
    'Check transaction details carefully before signing',
  ];

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
      <Shield className="w-4 h-4" />
      Security Info
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            INTENT Security
          </DialogTitle>
          <DialogDescription>
            How we protect your wallet and assets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Security Points */}
          <div className="space-y-3">
            {securityPoints.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 shrink-0">
                  <point.icon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400">{point.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{point.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Warning Section */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-500">Security Reminders</span>
            </div>
            <ul className="space-y-1">
              {warningPoints.map((point, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500 shrink-0">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Verification */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">Verified Domain</span>
            </div>
            <span className="text-xs font-mono text-foreground">app-intent.lovable.app</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletSecurityInfo;
