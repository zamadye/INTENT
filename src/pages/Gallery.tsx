import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { Search, Filter, X, ExternalLink, Copy, Download, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useWallet } from '@/contexts/WalletContext';
import toast from 'react-hot-toast';

// Mock data for campaigns
const generateMockCampaigns = () => {
  const types = ['product-launch', 'community-event', 'educational', 'meme-campaign', 'defi-promotion'];
  const typeLabels: Record<string, string> = {
    'product-launch': 'Product Launch',
    'community-event': 'Community Event',
    'educational': 'Educational',
    'meme-campaign': 'Meme Campaign',
    'defi-promotion': 'DeFi Promotion',
  };
  
  const captions = [
    '🚀 Arc Network is revolutionizing blockchain with USDC gas fees. No more ETH volatility!',
    '⚡ Sub-second finality on Arc means your transactions confirm before you can blink. The future is now.',
    '💎 Just minted my first NFT on Arc Testnet. The Malachite consensus is incredibly smooth.',
    '🔥 ArcFlow Finance is bringing next-level DeFi to the ecosystem. Are you ready?',
    '🌐 Building on Arc Testnet and loving every moment. Join the revolution!',
    '💰 USDC as native gas = predictable costs. Game changer for dApp development.',
    '🎯 Arc Network combining speed, security, and simplicity. This is what Web3 needs.',
    '🛠️ Developer experience on Arc is unmatched. Documentation is 🔥',
  ];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `campaign-${i}`,
    type: types[Math.floor(Math.random() * types.length)],
    typeLabel: '',
    caption: captions[Math.floor(Math.random() * captions.length)],
    imageUrl: `https://picsum.photos/seed/arc-${i}/600/400`,
    creator: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    tokenId: 1000 + i,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
  })).map(c => ({ ...c, typeLabel: typeLabels[c.type] }));
};

const mockCampaigns = generateMockCampaigns();

interface Campaign {
  id: string;
  type: string;
  typeLabel: string;
  caption: string;
  imageUrl: string;
  creator: string;
  createdAt: Date;
  tokenId: number;
  txHash: string;
}

const Gallery: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignType, setCampaignType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [myMintsOnly, setMyMintsOnly] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const filteredCampaigns = useMemo(() => {
    let filtered = [...mockCampaigns];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.caption.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (campaignType !== 'all') {
      filtered = filtered.filter(c => c.type === campaignType);
    }

    // Date filter
    if (dateRange !== 'all') {
      const now = Date.now();
      const ranges: Record<string, number> = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      filtered = filtered.filter(c =>
        now - c.createdAt.getTime() <= ranges[dateRange]
      );
    }

    // Sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return filtered;
  }, [searchQuery, campaignType, dateRange, sortBy, myMintsOnly]);

  const clearFilters = () => {
    setSearchQuery('');
    setCampaignType('all');
    setDateRange('all');
    setSortBy('recent');
    setMyMintsOnly(false);
  };

  const activeFilterCount = [
    searchQuery,
    campaignType !== 'all',
    dateRange !== 'all',
    myMintsOnly,
  ].filter(Boolean).length;

  const copyLink = (campaignId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/gallery/${campaignId}`);
    toast.success('Link copied!');
  };

  const masonryBreakpoints = {
    default: 4,
    1024: 3,
    768: 2,
    640: 1,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Campaign Gallery
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore campaigns created by the Arc Network community. 
              Each piece is minted as a unique NFT on Arc Testnet.
            </p>
          </motion.div>

          {/* Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-4 mb-8 border border-border/50"
          >
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns..."
                  className="pl-10"
                />
              </div>

              {/* Campaign Type */}
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Campaign Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="product-launch">Product Launch</SelectItem>
                  <SelectItem value="community-event">Community Event</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="meme-campaign">Meme Campaign</SelectItem>
                  <SelectItem value="defi-promotion">DeFi Promotion</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>

              {/* My Mints Toggle */}
              {isConnected && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={myMintsOnly}
                    onCheckedChange={setMyMintsOnly}
                    id="my-mints"
                  />
                  <label htmlFor="my-mints" className="text-sm whitespace-nowrap">
                    My Mints Only
                  </label>
                </div>
              )}

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear ({activeFilterCount})
                </Button>
              )}
            </div>
          </motion.div>

          {/* Gallery Grid */}
          {filteredCampaigns.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">No campaigns found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </motion.div>
          ) : (
            <Masonry
              breakpointCols={masonryBreakpoints}
              className="flex -ml-6 w-auto"
              columnClassName="pl-6 bg-clip-padding"
            >
              {filteredCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="mb-6"
                >
                  <div
                    onClick={() => setSelectedCampaign(campaign)}
                    className="glass rounded-2xl overflow-hidden border border-border/50 cursor-pointer transition-all duration-300 hover:border-primary/50 hover:translate-y-[-8px] hover:shadow-[0_20px_50px_hsl(189_100%_50%/0.15)]"
                  >
                    {/* Image */}
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={campaign.imageUrl}
                        alt="Campaign"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
                          {campaign.typeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-sm line-clamp-3 mb-3">{campaign.caption}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{campaign.creator}</span>
                        <span>{formatDistanceToNow(campaign.createdAt, { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                        <span className="text-xs text-primary">Arc Testnet</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyLink(campaign.id);
                          }}
                          className="p-1 hover:text-primary transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </Masonry>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-3xl">
          {selectedCampaign && (
            <div className="space-y-6">
              {/* Image */}
              <div className="rounded-xl overflow-hidden">
                <img
                  src={selectedCampaign.imageUrl}
                  alt="Campaign"
                  className="w-full"
                />
              </div>

              {/* Caption */}
              <p className="text-lg leading-relaxed">{selectedCampaign.caption}</p>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Token ID</span>
                  <p className="font-medium">#{selectedCampaign.tokenId}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Mint Date</span>
                  <p className="font-medium">
                    {selectedCampaign.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Chain</span>
                  <p className="font-medium">Arc Testnet</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Creator</span>
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{selectedCampaign.creator}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCampaign.creator);
                        toast.success('Address copied!');
                      }}
                      className="hover:text-primary"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <a
                    href={`https://testnet.arcscan.app/tx/${selectedCampaign.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </a>
                </Button>
                <Button variant="outline" onClick={() => copyLink(selectedCampaign.id)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Campaign
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Gallery;
