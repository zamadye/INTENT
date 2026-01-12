import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';
import toast from 'react-hot-toast';

export interface MarketplaceNFT {
  id: string;
  campaign_id: string;
  token_id: string | null;
  wallet_address: string;
  status: string;
  minted_at: string | null;
  created_at: string;
  listing_price: number | null;
  is_listed: boolean;
  listed_at: string | null;
  seller_address: string | null;
  views_count: number;
  likes_count: number;
  tx_hash: string | null;
  campaign: {
    id: string;
    campaign_type: string;
    caption: string;
    image_url: string | null;
    image_style: string;
    created_at: string;
    wallet_address: string;
  } | null;
}

export interface MarketplaceStats {
  floor_price: number;
  total_volume: number;
  total_sales: number;
  total_listed: number;
  avg_price: number;
}

// Auto-pricing algorithm based on campaign metrics
export const calculateAutoPrice = (
  campaignType: string,
  viewsCount: number,
  likesCount: number,
  floorPrice: number
): number => {
  // Base price multipliers for campaign types
  const typeMultipliers: Record<string, number> = {
    'product-launch': 1.5,
    'defi-promotion': 1.3,
    'community-event': 1.2,
    'educational': 1.1,
    'meme-campaign': 1.0,
  };

  const baseMultiplier = typeMultipliers[campaignType] || 1.0;
  
  // Engagement bonus (views + likes * 2)
  const engagementScore = viewsCount + (likesCount * 2);
  const engagementMultiplier = 1 + (engagementScore / 1000) * 0.5; // Up to 50% bonus for high engagement
  
  // Calculate price with floor as minimum
  const calculatedPrice = floorPrice * baseMultiplier * engagementMultiplier;
  
  // Round to 4 decimal places and ensure minimum floor price
  return Math.max(floorPrice, Math.round(calculatedPrice * 10000) / 10000);
};

export const useMarketplace = () => {
  const { address } = useWallet();
  const [nfts, setNfts] = useState<MarketplaceNFT[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('marketplace_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching marketplace stats:', error);
      return;
    }

    setStats(data);
  }, []);

  const fetchNFTs = useCallback(async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('nfts')
      .select(`
        *,
        campaign:campaigns(*)
      `)
      .eq('status', 'minted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching NFTs:', error);
      toast.error('Failed to load NFTs');
      setLoading(false);
      return;
    }

    setNfts(data as MarketplaceNFT[]);
    setLoading(false);
  }, []);

  const fetchUserLikes = useCallback(async () => {
    if (!address) return;

    const { data } = await supabase
      .from('nft_likes')
      .select('nft_id')
      .eq('wallet_address', address.toLowerCase());

    if (data) {
      setUserLikes(new Set(data.map(l => l.nft_id)));
    }
  }, [address]);

  useEffect(() => {
    fetchStats();
    fetchNFTs();
  }, [fetchStats, fetchNFTs]);

  useEffect(() => {
    fetchUserLikes();
  }, [fetchUserLikes]);

  const listNFT = async (nftId: string, price?: number) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return false;
    }

    const nft = nfts.find(n => n.id === nftId);
    if (!nft || !nft.campaign) {
      toast.error('NFT not found');
      return false;
    }

    // Calculate auto price if not provided
    const listingPrice = price || calculateAutoPrice(
      nft.campaign.campaign_type,
      nft.views_count,
      nft.likes_count,
      stats?.floor_price || 0.01
    );

    const { error } = await supabase
      .from('nfts')
      .update({
        is_listed: true,
        listing_price: listingPrice,
        listed_at: new Date().toISOString(),
        seller_address: address.toLowerCase(),
      })
      .eq('id', nftId)
      .eq('wallet_address', address.toLowerCase());

    if (error) {
      console.error('Error listing NFT:', error);
      toast.error('Failed to list NFT');
      return false;
    }

    // Update stats
    await supabase
      .from('marketplace_stats')
      .update({
        total_listed: (stats?.total_listed || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null);

    toast.success(`NFT listed for ${listingPrice} USDC`);
    fetchNFTs();
    fetchStats();
    return true;
  };

  const unlistNFT = async (nftId: string) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return false;
    }

    const { error } = await supabase
      .from('nfts')
      .update({
        is_listed: false,
        listing_price: null,
        listed_at: null,
        seller_address: null,
      })
      .eq('id', nftId)
      .eq('wallet_address', address.toLowerCase());

    if (error) {
      console.error('Error unlisting NFT:', error);
      toast.error('Failed to unlist NFT');
      return false;
    }

    // Update stats
    await supabase
      .from('marketplace_stats')
      .update({
        total_listed: Math.max(0, (stats?.total_listed || 0) - 1),
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null);

    toast.success('NFT unlisted');
    fetchNFTs();
    fetchStats();
    return true;
  };

  const buyNFT = async (nftId: string) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return false;
    }

    const nft = nfts.find(n => n.id === nftId);
    if (!nft || !nft.is_listed || !nft.listing_price) {
      toast.error('NFT not available for purchase');
      return false;
    }

    if (nft.wallet_address.toLowerCase() === address.toLowerCase()) {
      toast.error('You cannot buy your own NFT');
      return false;
    }

    // TODO: Integrate actual USDC payment via smart contract
    // For now, simulate the transaction
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

    // Update NFT ownership
    const { error: updateError } = await supabase
      .from('nfts')
      .update({
        wallet_address: address.toLowerCase(),
        is_listed: false,
        listing_price: null,
        listed_at: null,
        seller_address: null,
        buyer_address: address.toLowerCase(),
        sold_at: new Date().toISOString(),
      })
      .eq('id', nftId);

    if (updateError) {
      console.error('Error buying NFT:', updateError);
      toast.error('Failed to complete purchase');
      return false;
    }

    // Record transaction
    await supabase.from('marketplace_transactions').insert({
      nft_id: nftId,
      seller_address: nft.seller_address || nft.wallet_address,
      buyer_address: address.toLowerCase(),
      price: nft.listing_price,
      tx_hash: txHash,
    });

    // Update marketplace stats
    const newVolume = (stats?.total_volume || 0) + nft.listing_price;
    const newSales = (stats?.total_sales || 0) + 1;
    const newAvgPrice = newVolume / newSales;

    // Calculate new floor price (minimum listed price)
    const listedNfts = nfts.filter(n => n.is_listed && n.listing_price && n.id !== nftId);
    const newFloorPrice = listedNfts.length > 0
      ? Math.min(...listedNfts.map(n => n.listing_price!))
      : stats?.floor_price || 0.01;

    await supabase
      .from('marketplace_stats')
      .update({
        total_volume: newVolume,
        total_sales: newSales,
        avg_price: newAvgPrice,
        floor_price: newFloorPrice,
        total_listed: Math.max(0, (stats?.total_listed || 0) - 1),
        updated_at: new Date().toISOString(),
      })
      .not('id', 'is', null);

    toast.success('NFT purchased successfully!');
    fetchNFTs();
    fetchStats();
    return true;
  };

  const likeNFT = async (nftId: string) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return false;
    }

    const isLiked = userLikes.has(nftId);

    if (isLiked) {
      // Unlike
      await supabase
        .from('nft_likes')
        .delete()
        .eq('nft_id', nftId)
        .eq('wallet_address', address.toLowerCase());

      await supabase
        .from('nfts')
        .update({ likes_count: Math.max(0, (nfts.find(n => n.id === nftId)?.likes_count || 1) - 1) })
        .eq('id', nftId);

      setUserLikes(prev => {
        const next = new Set(prev);
        next.delete(nftId);
        return next;
      });
    } else {
      // Like
      await supabase.from('nft_likes').insert({
        nft_id: nftId,
        wallet_address: address.toLowerCase(),
      });

      await supabase
        .from('nfts')
        .update({ likes_count: (nfts.find(n => n.id === nftId)?.likes_count || 0) + 1 })
        .eq('id', nftId);

      setUserLikes(prev => new Set(prev).add(nftId));
    }

    fetchNFTs();
    return true;
  };

  const incrementViews = async (nftId: string) => {
    await supabase
      .from('nfts')
      .update({ views_count: (nfts.find(n => n.id === nftId)?.views_count || 0) + 1 })
      .eq('id', nftId);
  };

  return {
    nfts,
    stats,
    loading,
    userLikes,
    listNFT,
    unlistNFT,
    buyNFT,
    likeNFT,
    incrementViews,
    refetch: fetchNFTs,
  };
};
