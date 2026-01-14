import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Link2, Download, X, Check, ExternalLink } from 'lucide-react';
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
  };
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  campaign,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);

  const campaignLink = `${window.location.origin}/proofs/${campaign.id}`;

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
        link.download = `intent-campaign-${campaign.id}.png`;
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
        link.download = `intent-campaign-${campaign.id}.png`;
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

  // Share to Twitter
  const shareToTwitter = async () => {
    // Download image first
    await downloadImage();

    // Compose tweet text with campaign link
    const tweetText = `${campaign.caption}\n\n🔒 Recorded as structured intent on Arc Network\n\n${campaignLink}`;
    
    // Open Twitter composer
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    
    toast.success('Twitter opened! Attach the downloaded image before posting.');
  };

  // Copy link to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignLink);
      toast.success('Link copied!');
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
            Share Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          {campaign.imageUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
              <img
                src={campaign.imageUrl}
                alt="Campaign preview"
                className="w-full h-full object-cover"
              />
            </div>
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
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Share on X / Twitter
            </Button>

            {/* Copy Link */}
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={copyLink}
            >
              <Link2 className="w-5 h-5" />
              Copy Link
              <span className="text-xs text-muted-foreground ml-auto">
                Image preview via link
              </span>
            </Button>

            {/* Download */}
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

          {/* Instruction for Twitter */}
          {imageCopied && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-accent/10 border border-accent/30"
            >
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-accent mt-0.5" />
                <p className="text-sm text-accent">
                  Image downloaded! Attach it to your tweet before posting.
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
