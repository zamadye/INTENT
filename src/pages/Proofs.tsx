import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Eye, Calendar, Fingerprint, ExternalLink, Send, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { JazziconAvatar } from '@/components/JazziconAvatar';
import { useWallet } from '@/contexts/WalletContext';
import { useProofs, type ProofItem } from '@/hooks/useProofs';
import { Loader2 } from 'lucide-react';

const INTENT_CATEGORIES = {
  builder: { label: 'Builder', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  defi: { label: 'DeFi', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  social: { label: 'Social', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  infrastructure: { label: 'Infrastructure', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const Proofs: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { proofs, loading, incrementViews } = useProofs();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedProof, setSelectedProof] = useState<ProofItem | null>(null);

  const filteredProofs = useMemo(() => {
    let result = [...proofs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.campaign?.caption?.toLowerCase().includes(query) ||
          p.wallet_address.toLowerCase().includes(query) ||
          p.fingerprint?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter((p) => p.intent_category === filterCategory);
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [proofs, searchQuery, filterCategory, sortBy]);

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const truncateHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  const handleViewProof = (proof: ProofItem) => {
    setSelectedProof(proof);
    incrementViews(proof.id);
  };

  const getCategoryStyle = (category: string | null) => {
    if (!category) return 'bg-muted text-muted-foreground';
    return INTENT_CATEGORIES[category as keyof typeof INTENT_CATEGORIES]?.color || 'bg-muted text-muted-foreground';
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return 'Unknown';
    return INTENT_CATEGORIES[category as keyof typeof INTENT_CATEGORIES]?.label || category;
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
            className="mb-8"
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Intent Proofs
            </h1>
            <p className="text-muted-foreground">
              On-chain record of structured participation on Arc Network
            </p>
          </motion.div>

          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50 flex items-start gap-3"
          >
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Intent Proofs are records of participation, not collectibles. They can be transferred but have no inherent market value. 
              Each proof represents a completed structured intent on the platform.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by caption, address, or fingerprint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-border/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
                  <SelectValue placeholder="Intent Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="defi">DeFi</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Proofs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProofs.length === 0 ? (
            <div className="text-center py-20">
              <Fingerprint className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-display text-xl font-semibold mb-2">No Proofs Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No completed intents have been recorded yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProofs.map((proof, index) => (
                <motion.div
                  key={proof.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="overflow-hidden bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 cursor-pointer"
                    onClick={() => handleViewProof(proof)}
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {proof.campaign?.image_url ? (
                        <img
                          src={proof.campaign.image_url}
                          alt="Campaign"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Fingerprint className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                      )}
                      {/* Category Badge */}
                      <Badge
                        className={`absolute top-2 right-2 ${getCategoryStyle(proof.intent_category)}`}
                      >
                        {getCategoryLabel(proof.intent_category)}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Proof ID */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground">
                          Proof #{proof.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(proof.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Caption Preview */}
                      <p className="text-sm text-foreground line-clamp-2">
                        {proof.campaign?.caption || 'No caption available'}
                      </p>

                      {/* Owner */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <JazziconAvatar address={proof.wallet_address} diameter={20} />
                          <span className="text-xs text-muted-foreground font-mono">
                            {truncateAddress(proof.wallet_address)}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Proof Detail Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-2xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={getCategoryStyle(selectedProof?.intent_category || null)}>
                {getCategoryLabel(selectedProof?.intent_category || null)}
              </Badge>
              Proof #{selectedProof?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              Structured intent proof details
            </DialogDescription>
          </DialogHeader>

          {selectedProof && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                {selectedProof.campaign?.image_url ? (
                  <img
                    src={selectedProof.campaign.image_url}
                    alt="Campaign"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Fingerprint className="w-16 h-16 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                {/* Caption */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">AI Summary</h4>
                  <p className="text-foreground text-sm">{selectedProof.campaign?.caption || 'No caption'}</p>
                </div>

                {/* Owner */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Owner</h4>
                  <div className="flex items-center gap-2">
                    <JazziconAvatar address={selectedProof.wallet_address} diameter={24} />
                    <span className="font-mono text-sm">{truncateAddress(selectedProof.wallet_address)}</span>
                    {address?.toLowerCase() === selectedProof.wallet_address.toLowerCase() && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </div>
                </div>

                {/* dApp List */}
                {selectedProof.dapp_list && selectedProof.dapp_list.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Target dApps</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProof.dapp_list.map((dapp, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {dapp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Order */}
                {selectedProof.action_order && selectedProof.action_order.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Action Order</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      {selectedProof.action_order.map((action, i) => (
                        <li key={i} className="text-muted-foreground">{action}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Fingerprint */}
                {selectedProof.fingerprint && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Fingerprint Hash</h4>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded block break-all">
                      {selectedProof.fingerprint}
                    </code>
                  </div>
                )}

                {/* Completed At */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Completed</h4>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(selectedProof.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  {selectedProof.tx_hash && (
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={`https://testnet.arcscan.app/tx/${selectedProof.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Explorer
                      </a>
                    </Button>
                  )}

                  {address?.toLowerCase() === selectedProof.wallet_address.toLowerCase() && (
                    <Button variant="outline" className="w-full text-muted-foreground">
                      <Send className="w-4 h-4 mr-2" />
                      Transfer Ownership
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Proofs;