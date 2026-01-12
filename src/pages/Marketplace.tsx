import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { Loader2, Store } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useMarketplace, calculateAutoPrice } from '@/hooks/useMarketplace';
import { MarketplaceStats } from '@/components/marketplace/MarketplaceStats';
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters';
import { NFTCard } from '@/components/marketplace/NFTCard';

const Marketplace: React.FC = () => {
  const {
    nfts,
    stats,
    loading,
    userLikes,
    listNFT,
    unlistNFT,
    buyNFT,
    likeNFT,
    incrementViews,
  } = useMarketplace();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterType, setFilterType] = useState('all');
  const [showListedOnly, setShowListedOnly] = useState(false);

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('newest');
    setFilterType('all');
    setShowListedOnly(false);
  };

  // Filter and sort NFTs
  const filteredNfts = useMemo(() => {
    let result = [...nfts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (nft) =>
          nft.campaign?.caption?.toLowerCase().includes(query) ||
          nft.wallet_address.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter((nft) => nft.campaign?.campaign_type === filterType);
    }

    // Listed only filter
    if (showListedOnly) {
      result = result.filter((nft) => nft.is_listed);
    }

    // Sort
    const floorPrice = stats?.floor_price || 0.01;
    
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'price-low':
        result.sort((a, b) => {
          const priceA = a.listing_price || (a.campaign ? calculateAutoPrice(a.campaign.campaign_type, a.views_count, a.likes_count, floorPrice) : floorPrice);
          const priceB = b.listing_price || (b.campaign ? calculateAutoPrice(b.campaign.campaign_type, b.views_count, b.likes_count, floorPrice) : floorPrice);
          return priceA - priceB;
        });
        break;
      case 'price-high':
        result.sort((a, b) => {
          const priceA = a.listing_price || (a.campaign ? calculateAutoPrice(a.campaign.campaign_type, a.views_count, a.likes_count, floorPrice) : floorPrice);
          const priceB = b.listing_price || (b.campaign ? calculateAutoPrice(b.campaign.campaign_type, b.views_count, b.likes_count, floorPrice) : floorPrice);
          return priceB - priceA;
        });
        break;
      case 'most-liked':
        result.sort((a, b) => b.likes_count - a.likes_count);
        break;
      case 'most-viewed':
        result.sort((a, b) => b.views_count - a.views_count);
        break;
      default: // newest
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return result;
  }, [nfts, searchQuery, filterType, showListedOnly, sortBy, stats?.floor_price]);

  const masonryBreakpoints = {
    default: 4,
    1280: 3,
    1024: 2,
    640: 1,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              NFT Marketplace
            </h1>
          </div>
          <p className="text-muted-foreground">
            Buy, sell, and collect Arc Campaign NFTs
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <MarketplaceStats stats={stats} />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <MarketplaceFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            showListedOnly={showListedOnly}
            onShowListedOnlyChange={setShowListedOnly}
            onClearFilters={clearFilters}
          />
        </motion.div>

        {/* NFT Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredNfts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No NFTs Found
            </h3>
            <p className="text-muted-foreground">
              {nfts.length === 0
                ? 'Create a campaign and mint your first NFT to see it here!'
                : 'Try adjusting your filters or search query.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Masonry
              breakpointCols={masonryBreakpoints}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-clip-padding"
            >
              {filteredNfts.map((nft) => (
                <div key={nft.id} className="mb-4">
                  <NFTCard
                    nft={nft}
                    isLiked={userLikes.has(nft.id)}
                    floorPrice={stats?.floor_price || 0.01}
                    onBuy={buyNFT}
                    onList={listNFT}
                    onUnlist={unlistNFT}
                    onLike={likeNFT}
                    onView={incrementViews}
                  />
                </div>
              ))}
            </Masonry>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
