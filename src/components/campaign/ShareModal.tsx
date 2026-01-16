import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Link2, Download, Check, Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

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

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  campaign,
  proofMinted = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);

  // Use shortened share URL - redirects to home page
  const sharePageUrl = `${window.location.origin}/p/${campaign.id}`;
  
  // Direct link to home page
  const homePageUrl = `${window.location.origin}/`;

  // Determine if sharing is allowed (only after proof is minted)
  const canShare = proofMinted || campaign.status === 'minted' || campaign.status === 'shared';

  // Download image
  const downloadImage = async () => {
    if (!campaign.imageUrl) {
      toast.error('No image available to download');
      return;
    }

    setIsDownloading(true);
    try {
      // For base64 images
      if (campaign.imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = campaign.imageUrl;
        link.download = `intent-proof-${campaign.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For URL images
        const response = await fetch(campaign.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `intent-proof-${campaign.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success('Image downloaded!');
      setImageCopied(true);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  // Share to Twitter - uses share page URL for automatic image preview
  const shareToTwitter = () => {
    if (!canShare) {
      toast.error('Mint proof first to share');
      return;
    }

    // Compose tweet text with share page link (for image preview)
    const tweetText = `${campaign.caption}\n\n🔒 Recorded as structured intent on Arc Network\n\n${sharePageUrl}`;

    // Open Twitter composer
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=500');

    // Also download image as backup
    void (async () => {
      try {
        if (campaign.imageUrl && !campaign.imageUrl.startsWith('data:')) {
          // If it's a public URL, just notify user
          toast.success('Tweet opened! Image will appear as preview from the link.');
        } else {
          // For base64, download as backup
          await downloadImage();
          try {
            await navigator.clipboard.writeText(tweetText);
            toast.success('Tweet text copied. Attach downloaded image if preview doesn\'t appear.');
          } catch {
            toast.success('Twitter opened! Attach the downloaded image if needed.');
          }
        }
      } catch (err) {
        console.error('Share helper error:', err);
      }
    })();
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
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Download image and copy caption
  const downloadAndCopy = async () => {
    await downloadImage();
    try {
      await navigator.clipboard.writeText(campaign.caption);
      toast.success('Image downloaded & caption copied!');
    } catch (error) {
      toast('Image downloaded! Caption copy failed.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Proof
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Gate message if not minted */}
          {!canShare && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/30"
            >
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Proof Required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mint your proof first to unlock sharing. This ensures your intent is recorded on-chain before sharing.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Image Preview - clickable to home */}
          {campaign.imageUrl && (
            <a 
              href={homePageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block aspect-video rounded-lg overflow-hidden bg-secondary hover:opacity-90 transition-opacity cursor-pointer"
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
            </a>
          )}

          {/* Caption Preview */}
          <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
            <p className="text-sm line-clamp-3">{campaign.caption}</p>
          </div>

          {/* Share Actions */}
          <div className="space-y-3">
            {/* Twitter Share */}
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={shareToTwitter}
              disabled={!canShare}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X / Twitter
              {canShare && (
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  with image preview
                </span>
              )}
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
              {canShare && (
                <span className="text-xs text-muted-foreground ml-auto">
                  OpenGraph enabled
                </span>
              )}
            </Button>

            {/* Download - always available */}
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={downloadAndCopy}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Download Image & Copy Caption
            </Button>
          </div>

          {/* Success feedback */}
          {imageCopied && canShare && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-accent/10 border border-accent/30"
            >
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5" />
                <p className="text-sm text-accent">
                  Ready to share! The link will show your proof image automatically on X.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
