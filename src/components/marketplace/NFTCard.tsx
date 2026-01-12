import React, { useState } from 'react';
import { Heart, Eye, ShoppingCart, Tag, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { JazziconAvatar } from '@/components/JazziconAvatar';
import { MarketplaceNFT, calculateAutoPrice } from '@/hooks/useMarketplace';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

interface NFTCardProps {
  nft: MarketplaceNFT;
  isLiked: boolean;
  floorPrice: number;
  onBuy: (nftId: string) => Promise<boolean>;
  onList: (nftId: string, price?: number) => Promise<boolean>;
  onUnlist: (nftId: string) => Promise<boolean>;
  onLike: (nftId: string) => Promise<boolean>;
  onView: (nftId: string) => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  isLiked,
  floorPrice,
  onBuy,
  onList,
  onUnlist,
  onLike,
  onView,
}) => {
  const { address, isConnected } = useWallet();
  const [showDetails, setShowDetails] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwner = address?.toLowerCase() === nft.wallet_address.toLowerCase();
  const campaign = nft.campaign;

  const autoPrice = campaign
    ? calculateAutoPrice(campaign.campaign_type, nft.views_count, nft.likes_count, floorPrice)
    : floorPrice;

  const handleBuy = async () => {
    setIsProcessing(true);
    await onBuy(nft.id);
    setIsProcessing(false);
    setShowDetails(false);
  };

  const handleList = async () => {
    setIsProcessing(true);
    const price = customPrice ? parseFloat(customPrice) : undefined;
    await onList(nft.id, price);
    setIsProcessing(false);
    setShowListDialog(false);
    setCustomPrice('');
  };

  const handleUnlist = async () => {
    setIsProcessing(true);
    await onUnlist(nft.id);
    setIsProcessing(false);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <Card
          className="overflow-hidden bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 cursor-pointer"
          onClick={() => {
            setShowDetails(true);
            onView(nft.id);
          }}
        >
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {campaign?.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.caption || 'NFT'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
            
            {/* Status Badge */}
            {nft.is_listed && (
              <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                Listed
              </Badge>
            )}

            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(nft.id);
              }}
              className={cn(
                "absolute top-2 left-2 p-2 rounded-full backdrop-blur-sm transition-colors",
                isLiked ? "bg-red-500/80 text-white" : "bg-background/50 text-foreground hover:bg-background/70"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Type Badge */}
            <Badge variant="outline" className="text-xs capitalize">
              {campaign?.campaign_type?.replace('-', ' ') || 'Campaign'}
            </Badge>

            {/* Caption Preview */}
            <p className="text-sm text-foreground line-clamp-2">
              {campaign?.caption || 'No caption'}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {nft.views_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {nft.likes_count}
              </span>
            </div>

            {/* Price / Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              {nft.is_listed && nft.listing_price ? (
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-lg font-bold text-primary">{nft.listing_price.toFixed(4)} USDC</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground">Est. Value</p>
                  <p className="text-lg font-semibold text-foreground">{autoPrice.toFixed(4)} USDC</p>
                </div>
              )}

              <div className="flex items-center gap-1">
                  <JazziconAvatar address={nft.wallet_address} diameter={24} />
                <span className="text-xs text-muted-foreground">
                  {truncateAddress(nft.wallet_address)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {campaign?.campaign_type?.replace('-', ' ') || 'Campaign'}
              </Badge>
              NFT #{nft.token_id || nft.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              Campaign NFT Details
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="aspect-square rounded-lg overflow-hidden">
              {campaign?.image_url ? (
                <img
                  src={campaign.image_url}
                  alt={campaign.caption || 'NFT'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Caption */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Caption</h4>
                <p className="text-foreground">{campaign?.caption || 'No caption'}</p>
              </div>

              {/* Owner */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Owner</h4>
                <div className="flex items-center gap-2">
                  <JazziconAvatar address={nft.wallet_address} diameter={24} />
                  <span className="font-mono text-sm">{truncateAddress(nft.wallet_address)}</span>
                  {isOwner && <Badge variant="secondary">You</Badge>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Views</h4>
                  <p className="text-lg font-semibold">{nft.views_count}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Likes</h4>
                  <p className="text-lg font-semibold">{nft.likes_count}</p>
                </div>
              </div>

              {/* Price */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {nft.is_listed ? 'Listed Price' : 'Estimated Value'}
                </h4>
                <p className="text-2xl font-bold text-primary">
                  {(nft.is_listed && nft.listing_price ? nft.listing_price : autoPrice).toFixed(4)} USDC
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {isConnected && (
                  <>
                    {isOwner ? (
                      nft.is_listed ? (
                        <Button
                          onClick={handleUnlist}
                          disabled={isProcessing}
                          variant="outline"
                          className="w-full"
                        >
                          <X className="w-4 h-4 mr-2" />
                          {isProcessing ? 'Processing...' : 'Unlist NFT'}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowListDialog(true)}
                          className="w-full bg-accent hover:bg-accent/90"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          List for Sale
                        </Button>
                      )
                    ) : nft.is_listed ? (
                      <Button
                        onClick={handleBuy}
                        disabled={isProcessing}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {isProcessing ? 'Processing...' : `Buy for ${nft.listing_price?.toFixed(4)} USDC`}
                      </Button>
                    ) : null}
                  </>
                )}

                <Button
                  onClick={() => onLike(nft.id)}
                  variant="outline"
                  className={cn("w-full", isLiked && "border-red-500 text-red-500")}
                >
                  <Heart className={cn("w-4 h-4 mr-2", isLiked && "fill-current")} />
                  {isLiked ? 'Liked' : 'Like'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* List Dialog */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set a price or use auto-pricing based on engagement metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Suggested Auto-Price (based on views, likes, campaign type):
              </p>
              <p className="text-2xl font-bold text-accent">{autoPrice.toFixed(4)} USDC</p>
            </div>

            <div>
              <label className="text-sm font-medium">Custom Price (optional)</label>
              <Input
                type="number"
                step="0.0001"
                min={floorPrice}
                placeholder={`Min: ${floorPrice} USDC`}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Floor price: {floorPrice.toFixed(4)} USDC
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowListDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleList}
                disabled={isProcessing}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                {isProcessing ? 'Listing...' : customPrice ? 'List at Custom Price' : 'List at Auto-Price'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
