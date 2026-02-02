import { X, Share2, Download, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge as BadgeType, BadgeUnlock } from '@/shared/types/badge';
import { BadgeCard } from './BadgeCard';
import { cn } from '@/lib/utils';

interface BadgeUnlockModalProps {
  badge: BadgeType;
  unlock: BadgeUnlock;
  open: boolean;
  onClose: () => void;
}

const rarityTextColors: Record<string, string> = {
  common: 'text-slate-400',
  uncommon: 'text-blue-400',
  rare: 'text-purple-400',
  epic: 'text-amber-400',
  legendary: 'text-amber-400',
};

export function BadgeUnlockModal({ 
  badge, 
  unlock, 
  open, 
  onClose 
}: BadgeUnlockModalProps) {
  const handleShare = () => {
    const text = `Just unlocked ${badge.name} badge on @INTENT_app 🎯\n\nProof of real activity across Arc ecosystem`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="sr-only">Badge Details</DialogTitle>
        </DialogHeader>
        
        <div className="text-center py-4">
          {/* Badge Visual */}
          <div className="flex justify-center mb-6">
            <BadgeCard 
              badge={badge} 
              unlock={unlock}
              size="lg"
              showDetails={false}
            />
          </div>
          
          {/* Badge Info */}
          <h2 className="text-xl font-display font-semibold">{badge.name}</h2>
          <p className={cn(
            'text-sm capitalize mt-1',
            rarityTextColors[badge.rarity]
          )}>
            {badge.rarity}
          </p>
          
          <p className="text-sm text-muted-foreground mt-4 max-w-sm mx-auto">
            {badge.description}
          </p>
          
          <div className="divider" />
          
          {/* Unlock Details */}
          <div className="text-left space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Unlocked On
              </p>
              <p className="text-sm font-mono mt-1">
                {formatDate(unlock.unlockedAt)}
              </p>
            </div>
            
            {unlock.triggerTxHash && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  On-Chain Proof
                </p>
                <a 
                  href={`https://testnet.arcscan.io/tx/${unlock.triggerTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  {unlock.triggerTxHash.slice(0, 10)}...{unlock.triggerTxHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
          
          <div className="divider" />
          
          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}