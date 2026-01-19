import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Link2, Download, Check, Lock, ExternalLink, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import {
  isMobile,
  canShareFiles,
  shareViaWebShareAPI,
  autoDownloadImage,
  trackShareEvent,
  openTwitterIntent,
  type ShareMethod,
} from '@/lib/shareUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    caption: string;
    imageUrl: string | null;
    status?: string;
  };
  proofMinted?: boolean;
}

// X/Twitter icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  campaign,
  proofMinted = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [supportsFileShare, setSupportsFileShare] = useState(false);

  // Use shortened share URL - redirects to home page
  const sharePageUrl = `${window.location.origin}/p/${campaign.id}`;

  // Determine if sharing is allowed (only after proof is minted)
  const canShare = proofMinted || campaign.status === 'minted' || campaign.status === 'shared';

  // Detect device capabilities on mount
  useEffect(() => {
    const detectCapabilities = async () => {
      setMobile(isMobile());
      const fileShareSupport = await canShareFiles();
      setSupportsFileShare(fileShareSupport);
    };
    detectCapabilities();
  }, []);

  // Compose tweet text with share URL at the end for proper Twitter Card preview
  const composeTweetText = (): string => {
    const captionWithoutShareUrl = campaign.caption.trim();
    return `${captionWithoutShareUrl}\n\n🔒 Recorded on Arc Network\n${sharePageUrl}`;
  };

  /**
   * 3-TIER SHARE STRATEGY
   * 
   * TIER 1: Mobile + Web Share API (native image sharing)
   * TIER 2: Desktop fallback (auto-download + Twitter intent)
   * TIER 3: Intent-only (if all else fails)
   */
  const shareToTwitter = async () => {
    if (!canShare) {
      toast.error('Mint proof first to share');
      return;
    }

    setIsSharing(true);
    const platform = mobile ? 'mobile' : 'desktop';
    const tweetText = composeTweetText();

    try {
      // TIER 1: Mobile with Web Share API (includes image natively)
      if (mobile && supportsFileShare && campaign.imageUrl) {
        const result = await shareViaWebShareAPI({
          text: tweetText,
          imageUrl: campaign.imageUrl,
          campaignId: campaign.id
        });

        if (result.success) {
          toast.success('✓ Shared with image!', { icon: '📱' });
          await trackShareEvent('web_share_api', campaign.id, platform);
          return;
        }

        if (result.method === 'cancelled') {
          // User cancelled - no error needed
          return;
        }

        // If Web Share API failed, fall through to desktop fallback
        console.log('Web Share API fallback:', result.error);
      }

      // TIER 2: Desktop fallback - Auto-download + Twitter intent
      if (campaign.imageUrl) {
        try {
          await autoDownloadImage(campaign.imageUrl, `intent-${campaign.id}.png`);
          openTwitterIntent(tweetText);
          
          toast.success('📸 Image downloaded! Attach it to your tweet before posting.', {
            duration: 8000,
            icon: '📎'
          });
          
          await trackShareEvent('desktop_fallback', campaign.id, platform);
          return;
        } catch (downloadError) {
          console.error('Download failed:', downloadError);
          // Fall through to intent-only
        }
      }

      // TIER 3: Final fallback - just open Twitter intent
      openTwitterIntent(tweetText);
      toast.success('Tweet opened! Image preview will appear from the share link.');
      await trackShareEvent('intent_only', campaign.id, platform);

    } catch (error) {
      console.error('Share error:', error);
      // Absolute final fallback
      openTwitterIntent(tweetText);
      toast.success('Tweet opened!');
      await trackShareEvent('intent_only', campaign.id, platform);
    } finally {
      setIsSharing(false);
    }
  };

  // Share link only (relies on Twitter Card for image preview)
  const shareLinkOnly = async () => {
    if (!canShare) {
      toast.error('Mint proof first to share');
      return;
    }

    const tweetText = composeTweetText();
    openTwitterIntent(tweetText);
    toast.success('Tweet opened! Image will show via preview link.');
    
    const platform = mobile ? 'mobile' : 'desktop';
    await trackShareEvent('intent_only', campaign.id, platform);
  };

  // Copy share link to clipboard
  const copyLink = async () => {
    if (!canShare) {
      toast.error('Mint proof first to share');
      return;
    }

    try {
      await navigator.clipboard.writeText(sharePageUrl);
      toast.success('Share link copied!');
      
      const platform = mobile ? 'mobile' : 'desktop';
      await trackShareEvent('copy_link', campaign.id, platform);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Download image only
  const downloadImage = async () => {
    if (!campaign.imageUrl) {
      toast.error('No image available to download');
      return;
    }

    setIsDownloading(true);
    try {
      await autoDownloadImage(campaign.imageUrl, `intent-proof-${campaign.id}.png`);
      toast.success('Image downloaded!');
      setImageCopied(true);
      
      const platform = mobile ? 'mobile' : 'desktop';
      await trackShareEvent('download', campaign.id, platform);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download image and copy caption
  const downloadAndCopy = async () => {
    await downloadImage();
    if (campaign.caption) {
      try {
        await navigator.clipboard.writeText(campaign.caption);
        toast.success('Caption copied to clipboard!');
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Proof
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          {campaign.imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-lg overflow-hidden border border-border"
            >
              <img
                src={campaign.imageUrl}
                alt="Campaign"
                className="w-full h-auto object-cover"
              />
            </motion.div>
          )}

          {/* Caption Preview */}
          {campaign.caption && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {campaign.caption}
              </p>
            </div>
          )}

          {/* Sharing Status */}
          {!canShare && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Lock className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">
                Mint your proof on-chain to enable sharing
              </p>
            </div>
          )}

          {/* Platform Detection Info */}
          {canShare && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {mobile ? (
                <>
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile detected - {supportsFileShare ? 'Native image sharing available' : 'Standard sharing'}</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3 h-3" />
                  <span>Desktop - Image will auto-download for attachment</span>
                </>
              )}
            </div>
          )}

          {/* Share Actions */}
          <div className="space-y-3">
            {/* Primary: Share to X with optimal method */}
            <Button
              variant="default"
              className="w-full justify-between gap-3 h-12"
              onClick={shareToTwitter}
              disabled={!canShare || isSharing}
            >
              <div className="flex items-center gap-3">
                {isSharing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XIcon className="w-5 h-5" />
                )}
                <span>
                  {mobile && supportsFileShare 
                    ? 'Share to X with Image' 
                    : 'Download & Share to X'}
                </span>
              </div>
              <span className="text-xs opacity-70">
                {mobile && supportsFileShare ? '📱 Native' : '💾 Auto-DL'}
              </span>
            </Button>

            {/* Secondary: Share Link Only (Twitter Card) */}
            <Button
              variant="outline"
              className="w-full justify-between gap-3"
              onClick={shareLinkOnly}
              disabled={!canShare}
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5" />
                <span>Share Link (Preview Image)</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Twitter Card
              </span>
            </Button>

            {/* Copy Link */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={copyLink}
              disabled={!canShare}
            >
              <Link2 className="w-5 h-5" />
              Copy Share Link
            </Button>

            {/* Download Image & Caption */}
            <Button
              variant="ghost"
              className="w-full justify-between gap-3"
              onClick={downloadAndCopy}
              disabled={isDownloading || !campaign.imageUrl}
            >
              <div className="flex items-center gap-3">
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : imageCopied ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>Download Image & Copy Caption</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Manual
              </span>
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {mobile && supportsFileShare ? (
                '📱 Your image will be included directly in the share'
              ) : mobile ? (
                '📱 Select X/Twitter from the share menu to post'
              ) : (
                '💻 Image will auto-download. Attach it manually to your tweet.'
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
