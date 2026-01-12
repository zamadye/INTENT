import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Edit3, Coins, Heart, MessageCircle, Repeat2, Share, 
  CheckCircle, ExternalLink, Loader2 
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
import { useNFTMinting } from '@/hooks/useNFTMinting';
import { cn } from '@/lib/utils';

interface CampaignPreviewProps {
  campaign: GeneratedCampaign | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onUpdateCaption: (caption: string) => void;
  campaignData?: {
    campaignType: string;
    imageStyle: string;
  };
  onMintSuccess?: (tokenId: string, txHash: string) => void;
}

export const CampaignPreview: React.FC<CampaignPreviewProps> = ({
  campaign,
  isGenerating,
  onRegenerate,
  onUpdateCaption,
  campaignData,
  onMintSuccess,
}) => {
  const { address, isConnected, isCorrectNetwork, connect, switchNetwork } = useWallet();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [showMintSuccess, setShowMintSuccess] = useState(false);

  const {
    isMinting,
    mintStatus,
    mintProgress,
    tokenId,
    txHash,
    error: mintError,
    mintNFT,
    MINT_COST_USDC,
  } = useNFTMinting();

  const handleEditOpen = () => {
    if (campaign) {
      setEditedCaption(campaign.caption);
      setIsEditModalOpen(true);
    }
  };

  const handleEditSave = () => {
    onUpdateCaption(editedCaption);
    setIsEditModalOpen(false);
  };

  const handleMint = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }

    if (!campaign || !address) return;

    const result = await mintNFT(
      campaign.id,
      campaign.caption,
      campaign.captionHash || '',
      campaign.imageUrl,
      campaignData?.campaignType || 'general',
      campaignData?.imageStyle || 'cyberpunk',
      address
    );

    if (result.success && result.tokenId && result.txHash) {
      setShowMintSuccess(true);
      onMintSuccess?.(result.tokenId, result.txHash);
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
            <span className="text-xs text-usdc font-medium">Live Preview</span>
          )}
        </div>

        {/* Mock Tweet Card */}
        <div className="bg-space-dark rounded-xl p-4 border border-border/30">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <JazziconAvatar address={address || '0x0000000000000000000000000000000000000000'} diameter={40} />
            <div>
              <div className="font-medium text-sm">Arc Campaigner</div>
              <div className="text-muted-foreground text-xs">@arc_campaign</div>
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

          {/* Image */}
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
                    <p className="text-xs text-muted-foreground">Generating image...</p>
                  </div>
                </motion.div>
              ) : campaign?.imageUrl ? (
                <motion.img
                  key="image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={campaign.imageUrl}
                  alt="Campaign preview"
                  className="w-full h-full object-cover"
                />
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
            <button className="flex items-center gap-1 hover:text-usdc transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span>128</span>
            </button>
            <button className="flex items-center gap-1 hover:text-destructive transition-colors">
              <Heart className="w-4 h-4" />
              <span>512</span>
            </button>
            <button className="flex items-center gap-1 hover:text-primary transition-colors">
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NFT Badge */}
        <div className="mt-4 p-3 rounded-lg bg-usdc/10 border border-usdc/30">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-usdc" />
            <span className="text-usdc font-medium">This will be minted as NFT</span>
          </div>
        </div>

        {/* Minting Progress */}
        {isMinting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{mintStatus}</span>
            </div>
            <Progress value={mintProgress} className="h-2" />
          </motion.div>
        )}

        {/* Mint Error */}
        {mintError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
          >
            <p className="text-sm text-destructive">{mintError}</p>
          </motion.div>
        )}

        {/* Action Buttons */}
        {campaign && !isGenerating && !isMinting && !tokenId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-3"
          >
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onRegenerate}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleEditOpen}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Caption
              </Button>
            </div>
            
            <Button 
              variant="gradient" 
              className="w-full" 
              size="lg"
              onClick={handleMint}
              disabled={isMinting}
            >
              <Coins className="w-5 h-5 mr-2" />
              {!isConnected 
                ? 'Connect Wallet to Mint' 
                : !isCorrectNetwork 
                  ? 'Switch to Arc Network' 
                  : 'Mint as NFT'
              }
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              Mint Cost: {MINT_COST_USDC} USDC + gas
            </p>
          </motion.div>
        )}

        {/* Minted Successfully */}
        {tokenId && txHash && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span className="font-medium text-accent">NFT Minted Successfully!</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Token ID: <span className="font-mono text-foreground">{tokenId}</span>
                </p>
                <a 
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  View on ArcScan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/marketplace'}
            >
              View in Marketplace
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
              Customize your campaign caption before minting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value.slice(0, 280))}
              className="min-h-[150px]"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {editedCaption.length}/280
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleEditSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mint Success Dialog */}
      <Dialog open={showMintSuccess} onOpenChange={setShowMintSuccess}>
        <DialogContent className="text-center">
          <div className="py-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <DialogTitle className="text-2xl mb-2">NFT Minted!</DialogTitle>
            <DialogDescription className="mb-6">
              Your campaign has been successfully minted as an NFT on Arc Network.
            </DialogDescription>
            
            <div className="space-y-3">
              <Button 
                variant="gradient" 
                className="w-full"
                onClick={() => window.location.href = '/marketplace'}
              >
                View in Marketplace
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowMintSuccess(false)}
              >
                Create Another Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CampaignPreview;
