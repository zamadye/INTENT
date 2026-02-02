import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BadgeCard } from '@/components/badges/BadgeCard';
import { BadgeUnlockModal } from '@/components/badges/BadgeUnlockModal';

import { useBadges, useUserBadgeUnlocks } from '@/hooks/useBadges';
import type { Badge, BadgeUnlock } from '@/shared/types/badge';

export default function Badges() {
  const { data: badges = [] } = useBadges();
  const { data: unlocks = [] } = useUserBadgeUnlocks();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<{ badge: Badge; unlock: BadgeUnlock } | null>(null);
  
  // Create unlock map
  const unlockMap = new Map(unlocks.map(u => [u.badgeId, u]));
  
  // Filter badges
  const filteredBadges = badges.filter(badge => {
    // Search filter
    if (search && !badge.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    // Unlock filter
    const isUnlocked = unlockMap.has(badge.id);
    if (filter === 'unlocked' && !isUnlocked) return false;
    if (filter === 'locked' && isUnlocked) return false;
    
    return true;
  });
  
  // Group by layer
  const groupedBadges = {
    identity: filteredBadges.filter(b => b.layer === 'identity'),
    proof: filteredBadges.filter(b => b.layer === 'proof'),
    event: filteredBadges.filter(b => b.layer === 'event'),
    social: filteredBadges.filter(b => b.layer === 'social'),
  };
  
  const unlockedCount = unlocks.length;
  const lockedCount = badges.length - unlockedCount;
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">All Badges</h1>
          <p className="text-muted-foreground">
            Explore all badges and track your progress
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search badges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({badges.length})
            </Button>
            <Button
              variant={filter === 'unlocked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unlocked')}
            >
              Unlocked ({unlockedCount})
            </Button>
            <Button
              variant={filter === 'locked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('locked')}
            >
              Locked ({lockedCount})
            </Button>
          </div>
        </div>
        
        {/* Identity Badges */}
        {groupedBadges.identity.length > 0 && (
          <section className="mb-10">
            <h2 className="section-header">Identity Badges</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Progression path - unlock higher tiers with consistent activity
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupedBadges.identity.map((badge, i) => {
                const unlock = unlockMap.get(badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <BadgeCard
                      badge={badge}
                      unlock={unlock}
                      onClick={() => unlock && setSelectedBadge({ badge, unlock })}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* Proof Badges */}
        {groupedBadges.proof.length > 0 && (
          <section className="mb-10">
            <h2 className="section-header">Proof Badges</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Independent achievements - all displayed together
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupedBadges.proof.map((badge, i) => {
                const unlock = unlockMap.get(badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <BadgeCard
                      badge={badge}
                      unlock={unlock}
                      onClick={() => unlock && setSelectedBadge({ badge, unlock })}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* Event Badges */}
        {groupedBadges.event.length > 0 && (
          <section className="mb-10">
            <h2 className="section-header">Event Badges</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Limited-time badges for special moments
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupedBadges.event.map((badge, i) => {
                const unlock = unlockMap.get(badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <BadgeCard
                      badge={badge}
                      unlock={unlock}
                      onClick={() => unlock && setSelectedBadge({ badge, unlock })}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* Social Badge */}
        {groupedBadges.social.length > 0 && (
          <section className="mb-10">
            <h2 className="section-header">Social Badge</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Proof of humanity - evolves with engagement
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupedBadges.social.map((badge, i) => {
                const unlock = unlockMap.get(badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <BadgeCard
                      badge={badge}
                      unlock={unlock}
                      onClick={() => unlock && setSelectedBadge({ badge, unlock })}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* Empty state */}
        {filteredBadges.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No badges found</p>
          </div>
        )}
      </main>
      
      <Footer />
      
      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeUnlockModal
          badge={selectedBadge.badge}
          unlock={selectedBadge.unlock}
          open={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}