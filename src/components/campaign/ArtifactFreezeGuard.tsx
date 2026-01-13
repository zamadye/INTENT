import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtifactFreezeGuardProps {
  isFrozen: boolean;
  status: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * ArtifactFreezeGuard - Wraps content that becomes immutable after finalization
 * Provides visual indication of frozen state and prevents interaction
 */
export const ArtifactFreezeGuard: React.FC<ArtifactFreezeGuardProps> = ({
  isFrozen,
  status,
  children,
  className,
}) => {
  if (!isFrozen) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Frozen content with visual lock overlay */}
      <div className="relative">
        {/* The actual content - still visible but non-interactive */}
        <div className="pointer-events-none select-none">
          {children}
        </div>

        {/* Subtle lock overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-accent/5 rounded-xl pointer-events-none"
        />

        {/* Frozen badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-accent/20 backdrop-blur-sm rounded-full border border-accent/30"
        >
          <Lock className="w-3 h-3 text-accent" />
          <span className="text-xs font-medium text-accent">
            {status === 'finalized' ? 'Finalized' : 'Shared'}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

interface FreezeWarningBannerProps {
  isFrozen: boolean;
  status: string;
}

/**
 * Banner shown when content is frozen
 */
export const FreezeWarningBanner: React.FC<FreezeWarningBannerProps> = ({
  isFrozen,
  status,
}) => {
  if (!isFrozen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/30"
    >
      <div className="flex items-start gap-2">
        <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-accent">
            Content is locked
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === 'finalized' 
              ? 'This artifact has been finalized and cannot be edited. The content hash is now permanent.'
              : 'This intent has been shared on-chain. The proof is immutable.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface EditAttemptWarningProps {
  show: boolean;
  onDismiss: () => void;
}

/**
 * Warning shown when user attempts to edit frozen content
 */
export const EditAttemptWarning: React.FC<EditAttemptWarningProps> = ({
  show,
  onDismiss,
}) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="max-w-sm p-6 bg-card rounded-xl border border-border shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <h3 className="font-semibold">Cannot Edit</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This content has been finalized and recorded on-chain. 
          To create new content, please start a new campaign.
        </p>
        <button
          onClick={onDismiss}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ArtifactFreezeGuard;
