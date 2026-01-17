import React from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SecurityBadgeProps {
  variant?: 'inline' | 'banner' | 'tooltip';
  showDetails?: boolean;
}

/**
 * Security Badge Component
 * 
 * Displays trust signals to users about INTENT's security practices.
 * This helps prevent phishing detection false positives by clearly
 * communicating that we never collect sensitive wallet credentials.
 */
export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ 
  variant = 'inline',
  showDetails = false 
}) => {
  if (variant === 'banner') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-lg p-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-400">
              Secure Connection
            </p>
            <p className="text-xs text-muted-foreground">
              We never ask for your seed phrase or private keys
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Wallet Connect Only</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'tooltip') {
    return (
      <div className="space-y-3 p-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Shield className="w-4 h-4" />
          <span className="font-medium text-sm">INTENT Security</span>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Never asks for seed phrases</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Never stores private keys</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Uses secure wallet connection</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>Signature requests shown in plain text</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>All transactions preview exact actions</span>
          </li>
        </ul>
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            <span className="text-yellow-500/80">
              Never share your seed phrase with anyone
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
      <Shield className="w-3 h-3 text-emerald-400" />
      <span className="text-xs font-medium text-emerald-400">Secure</span>
      {showDetails && (
        <span className="text-xs text-muted-foreground">• No seed phrase required</span>
      )}
    </div>
  );
};

export default SecurityBadge;
