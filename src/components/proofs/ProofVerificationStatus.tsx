/**
 * Real-time Proof Verification Status Indicator
 * Shows on-chain confirmation status with live updates
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Shield,
  Fingerprint
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

export type VerificationStatus = 'pending' | 'confirming' | 'verified' | 'failed';

interface ProofVerificationStatusProps {
  proofId: string;
  txHash?: string | null;
  verifiedAt?: string | null;
  initialStatus?: VerificationStatus;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  icon: typeof Clock;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  animate?: boolean;
}

const STATUS_CONFIG: Record<VerificationStatus, StatusConfig> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    description: 'Awaiting on-chain submission',
  },
  confirming: {
    icon: Loader2,
    label: 'Confirming',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    description: 'Transaction submitted, awaiting confirmation',
    animate: true,
  },
  verified: {
    icon: CheckCircle2,
    label: 'Verified',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
    description: 'On-chain verification complete',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    description: 'Verification failed',
  },
};

export const ProofVerificationStatus: React.FC<ProofVerificationStatusProps> = ({
  proofId,
  txHash,
  verifiedAt,
  initialStatus,
  showDetails = false,
  size = 'md',
}) => {
  const [status, setStatus] = useState<VerificationStatus>(() => {
    if (initialStatus) return initialStatus;
    if (verifiedAt) return 'verified';
    if (txHash) return 'confirming';
    return 'pending';
  });
  const [isPolling, setIsPolling] = useState(false);

  // Subscribe to real-time updates for this proof
  useEffect(() => {
    const channel = supabase
      .channel(`proof-${proofId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nfts',
          filter: `id=eq.${proofId}`,
        },
        (payload) => {
          const newData = payload.new as {
            tx_hash?: string;
            verified_at?: string;
            status?: string;
          };
          
          if (newData.verified_at) {
            setStatus('verified');
          } else if (newData.tx_hash) {
            setStatus('confirming');
          } else if (newData.status === 'failed') {
            setStatus('failed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proofId]);

  // Poll for confirmation if in confirming state
  useEffect(() => {
    if (status !== 'confirming' || !txHash) return;

    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('nfts')
          .select('verified_at, status')
          .eq('id', proofId)
          .single();
        
        if (data?.verified_at) {
          setStatus('verified');
          setIsPolling(false);
          clearInterval(pollInterval);
        } else if (data?.status === 'failed') {
          setStatus('failed');
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [status, txHash, proofId]);

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2',
    lg: 'text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {/* Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-flex items-center ${sizeClasses[size]} px-2 py-1 rounded-md border ${config.bgColor} ${config.borderColor}`}
            >
              <Icon 
                className={`${iconSizes[size]} ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
              />
              <span className={`font-medium ${config.color}`}>{config.label}</span>
              
              {status === 'verified' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Shield className={`${iconSizes[size]} text-accent ml-1`} />
                </motion.div>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>

        {/* Details Section */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {/* Fingerprint */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Fingerprint className="w-3 h-3" />
                <span className="font-mono">Proof #{proofId.slice(0, 8)}</span>
              </div>

              {/* Transaction Hash */}
              {txHash && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    asChild
                  >
                    <a
                      href={`https://testnet.arcscan.app/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Transaction
                    </a>
                  </Button>
                </div>
              )}

              {/* Verified Timestamp */}
              {verifiedAt && (
                <p className="text-xs text-muted-foreground">
                  Verified: {new Date(verifiedAt).toLocaleString()}
                </p>
              )}

              {/* Polling Indicator */}
              {isPolling && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Checking confirmation...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

/**
 * Compact inline status indicator
 */
export const ProofStatusBadge: React.FC<{
  status: VerificationStatus;
}> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.bgColor} ${config.borderColor} ${config.color} gap-1`}
    >
      <Icon className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
};