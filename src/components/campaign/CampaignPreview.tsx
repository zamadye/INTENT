import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Edit3, Heart, MessageCircle, Repeat2, Share, 
  CheckCircle, ExternalLink, Loader2, Lock, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { JazziconAvatar } from '@/components/JazziconAvatar';
import { useWallet } from '@/contexts/WalletContext';
import { GeneratedCampaign } from '@/hooks/useCampaignGeneration';
import { CampaignData } from '@/pages/CreateCampaign';
import { cn } from '@/lib/utils';
import { 
  ArtifactFreezeGuard, 
  FreezeWarningBanner, 
  EditAttemptWarning 
} from './ArtifactFreezeGuard';
import { ShareModal } from './ShareModal';

interface CampaignPreviewProps {
  campaign: GeneratedCampaign | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onUpdateCaption: (caption: string) => Promise<boolean> | void;
  campaignData?: CampaignData;
  onComplete?: () => void;
  isCompleting?: boolean;
  completedCampaignId?: string | null;
  campaignStatus?: string;
}

export const CampaignPreview: React.FC<CampaignPreviewProps> = ({
  campaign,
  isGenerating,
  onRegenerate,
  onUpdateCaption,
  campaignData,
  onComplete,
  isCompleting,
  completedCampaignId,
  campaignStatus = 'draft',
}) => {
  const { address, isConnected, isCorrectNetwork, connect, switchNetwork } = useWallet();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [showCompletionSuccess, setShowCompletionSuccess] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);

  // Determine if content is frozen (finalized or shared)
  const isFrozen = campaignStatus === 'finalized' || campaignStatus === 'shared' || !!completedCampaignId;

  // Check if intent fields are complete
  const isIntentComplete = campaignData && 
    campaignData.intentCategory !== '' &&
    campaignData.targetDApps.length >= 2 &&
    campaignData.actionOrder.length >= 3;

  const handleEditOpen = () => {
    // Block editing if content is frozen
    if (isFrozen) {
      setShowEditWarning(true);
      return;
    }
    if (campaign) {
      setEditedCaption(campaign.caption);
      setIsEditModalOpen(true);
    }
  };

  const handleRegenerate = () => {
    // Block regeneration if content is frozen
    if (isFrozen) {
      setShowEditWarning(true);
      return;
    }
    onRegenerate();
  };

  const handleEditSave = async () => {
    // Validate @ArcFlowFinance mention
    if (!editedCaption.includes('@ArcFlowFinance')) {
      setCaptionError('Caption must include @ArcFlowFinance mention');
      return;
    }
    
    setCaptionError(null);
    const result = await onUpdateCaption(editedCaption);
    if (result !== false) {
      setIsEditModalOpen(false);
    }
  };

  const handleComplete = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }

    if (onComplete) {
      await onComplete();
      setShowCompletionSuccess(true);
    }
  };

  // Generate Share URL
  const generateShareUrl = () => {
    if (!campaign) return '';
    
    let tweetText = campaign.caption;
    
    if (completedCampaignId) {
      tweetText += `\n\n🔒 Recorded as structured intent on Arc Network`;
    }
    
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  };

  const handleShare = () => {
    // Only allow share if proof exists
    if (campaign?.proof || completedCampaignId) {
      setIsShareModalOpen(true);
    }
  };

  // Empty state
  if (!campaign && !isGenerating) {
    return (
      <div className="glass rounded-2xl p-8 border border-border/50 min-h-[500px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <p>Your campaign preview appears here</p>
          <p className="text-sm mt-1">Fill in the form and click Generate</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-2xl p-6 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Preview</h3>
          {campaign && (
            <span className={cn(
              "text-xs font-medium",
              isFrozen ? "text-accent" : "text-primary"
            )}>
              {isFrozen ? '🔒 Locked' : 'Live Preview'}
            </span>
          )}
        </div>

        {/* Freeze warning banner */}
        <FreezeWarningBanner isFrozen={isFrozen} status={campaignStatus} />

        {/* Mock Tweet Card */}
        <div className="bg-space-dark rounded-xl p-4 border border-border/30">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <JazziconAvatar address={address || '0x0000000000000000000000000000000000000000'} diameter={40} />
            <div>
              <div className="font-medium text-sm">INTENT User</div>
              <div className="text-muted-foreground text-xs">@intent_user</div>
            </div>
          </div>

          {/* Caption */}
          <div className="mb-3">
            {isGenerating && !campaign?.caption ? (
              <div className="space-y-2">
                <div className="h-4 shimmer rounded w-full" />
                <div className="h-4 shimmer rounded w-4/5" />
                <div className="h-4 shimmer rounded w-3/4" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {campaign?.caption}
              </p>
            )}
          </div>

          {/* Image - clickable to home page */}
          <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-secondary/50">
            <AnimatePresence mode="wait">
              {campaign?.imageStatus === 'generating' || (isGenerating && !campaign?.imageUrl) ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">Generating image with AI...</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">3-Layer AI Pipeline</p>
                  </div>
                </motion.div>
              ) : campaign?.imageUrl ? (
                <motion.a
                  key="image"
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="block w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img
                    src={campaign.imageUrl}
                    alt="Campaign preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', campaign.imageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </motion.a>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <span className="text-4xl">🖼️</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fake engagement */}
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <button className="flex items-center gap-1 hover:text-primary transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>24</span>
            </button>
            <button className="flex items-center gap-1 hover:text-accent transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span>128</span>
            </button>
            <button className="flex items-center gap-1 hover:text-destructive transition-colors">
              <Heart className="w-4 h-4" />
              <span>512</span>
            </button>
            <button 
              className="flex items-center gap-1 hover:text-primary transition-colors"
              onClick={handleShare}
              title="Share"
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Intent Status Badge */}
        <div className={cn(
          "mt-4 p-3 rounded-lg border",
          isIntentComplete 
            ? "bg-accent/10 border-accent/30" 
            : "bg-muted/50 border-border/50"
        )}>
          <div className="flex items-center gap-2 text-sm">
            {isIntentComplete ? (
              <>
                <Shield className="w-4 h-4 text-accent" />
                <span className="text-accent font-medium">Ready to lock as on-chain proof</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Complete intent fields to lock proof</span>
              </>
            )}
          </div>
          {campaignData && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span className={campaignData.intentCategory ? "text-accent" : ""}>
                  {campaignData.intentCategory ? "✓" : "○"} Intent Category
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={campaignData.targetDApps.length >= 2 ? "text-accent" : ""}>
                  {campaignData.targetDApps.length >= 2 ? "✓" : "○"} Target dApps ({campaignData.targetDApps.length}/2 min)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={campaignData.actionOrder.length >= 3 ? "text-accent" : ""}>
                  {campaignData.actionOrder.length >= 3 ? "✓" : "○"} Action Order ({campaignData.actionOrder.length}/3 min)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Completing Progress */}
        {isCompleting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Locking intent...</span>
            </div>
            <Progress value={66} className="h-2" />
          </motion.div>
        )}

        {/* Action Buttons */}
        {campaign && !isGenerating && !isCompleting && !completedCampaignId && !isFrozen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-3"
          >
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleRegenerate} disabled={isFrozen}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleEditOpen} disabled={isFrozen}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Caption
              </Button>
            </div>

            {/* Share Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleShare}
            >
              <Share className="w-4 h-4 mr-2" />
              Share Campaign
            </Button>
            
            {/* Complete Campaign Button */}
            <Button 
              variant="gradient" 
              className="w-full" 
              size="lg"
              onClick={handleComplete}
              disabled={!isIntentComplete || isCompleting}
            >
              <Lock className="w-5 h-5 mr-2" />
              {!isConnected 
                ? 'Connect Wallet' 
                : !isCorrectNetwork 
                  ? 'Switch to Arc Network' 
                  : !isIntentComplete
                    ? 'Complete Intent Fields First'
                    : 'Lock Intent & Generate Proof'
              }
            </Button>
            
            {isIntentComplete && (
              <p className="text-center text-xs text-muted-foreground">
                Your intent will be recorded on-chain
              </p>
            )}
          </motion.div>
        )}

        {/* Completed Successfully - Proof Ready, Share Enabled */}
        {completedCampaignId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span className="font-medium text-accent">Proof Generated!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your intent proof is ready. Share it on X to show your activity!
              </p>
              {campaign?.proof?.txHash && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  TX: {campaign.proof.txHash.slice(0, 16)}...
                </p>
              )}
            </div>

            {/* Primary Share Action */}
            <Button 
              variant="gradient" 
              className="w-full"
              size="lg"
              onClick={handleShare}
            >
              <Share className="w-5 h-5 mr-2" />
              Share on X (Twitter)
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/proofs'}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View All Proofs
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Create Another Campaign
            </Button>
          </motion.div>
        )}
      </div>

      {/* Edit Caption Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
            <DialogDescription>
              Customize your campaign caption before completing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Textarea
                value={editedCaption}
                onChange={(e) => {
                  setEditedCaption(e.target.value.slice(0, 280));
                  setCaptionError(null);
                }}
                className="min-h-[150px]"
              />
              {/* @ArcFlowFinance warning */}
              {!editedCaption.includes('@ArcFlowFinance') && (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ @ArcFlowFinance mention required for campaign attribution
                </p>
              )}
              {captionError && (
                <p className="text-xs text-destructive mt-2">{captionError}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {editedCaption.length}/280
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="gradient" 
                  onClick={handleEditSave}
                  disabled={!editedCaption.includes('@ArcFlowFinance')}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Success Dialog */}
      <Dialog open={showCompletionSuccess} onOpenChange={setShowCompletionSuccess}>
        <DialogContent className="text-center">
          <div className="py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <DialogTitle className="text-2xl mb-2">Intent Recorded!</DialogTitle>
            <DialogDescription className="mb-6">
              Your structured intent has been locked on Arc Network. A proof will be generated and appear in your wallet.
            </DialogDescription>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleShare}
              >
                <Share className="w-4 h-4 mr-2" />
                Share Your Intent
              </Button>
              
              <Button 
                variant="gradient" 
                className="w-full"
                onClick={() => window.location.href = '/proofs'}
              >
                View Intent Proofs
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowCompletionSuccess(false);
                  window.location.reload();
                }}
              >
                Create Another Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit attempt warning for frozen content */}
      <EditAttemptWarning 
        show={showEditWarning} 
        onDismiss={() => setShowEditWarning(false)} 
      />

      {/* Share Modal - Only when proof is ready */}
      {campaign && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          campaign={{
            id: completedCampaignId || campaign.id,
            caption: campaign.caption,
            imageUrl: campaign.imageUrl,
            status: campaign.proof ? 'minted' : campaignStatus,
          }}
          proofMinted={!!campaign.proof || !!completedCampaignId}
        />
      )}
    </>
  );
};

export default CampaignPreview;
