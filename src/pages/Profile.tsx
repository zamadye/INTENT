import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Activity, 
  Layers, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { BadgeCard } from '@/components/badges/BadgeCard';
import { StatsCard } from '@/components/badges/StatsCard';
import { ProgressBar } from '@/components/badges/ProgressBar';
import { BadgeUnlockModal } from '@/components/badges/BadgeUnlockModal';
import { JazziconAvatar } from '@/components/JazziconAvatar';

import { useWallet } from '@/contexts/WalletContext';
import { 
  useBadges, 
  useUserBadgeUnlocks, 
  useUserBadgeProgress, 
  useProfileBadges,
  useBadgeProgressList 
} from '@/hooks/useBadges';
import type { Badge, BadgeUnlock } from '@/shared/types/badge';

export default function Profile() {
  const { address, truncatedAddress, isConnected, connect, isAuthenticated } = useWallet();
  const { data: badges = [] } = useBadges();
  const { data: unlocks = [] } = useUserBadgeUnlocks();
  const { data: progress } = useUserBadgeProgress();
  const profileBadges = useProfileBadges();
  const nextMilestones = useBadgeProgressList();
  
  const [selectedBadge, setSelectedBadge] = useState<{ badge: Badge; unlock: BadgeUnlock } | null>(null);
  
  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-2xl font-display font-semibold mb-3">
              Connect Your Wallet
            </h1>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your profile and badges.
            </p>
            <Button onClick={connect} size="lg">
              Connect Wallet
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Calculate intent score (0-10 scale)
  const intentScore = progress?.intentScore || 0;
  const scoreDisplay = intentScore.toFixed(1);
  
  // Get current identity badge info for progress
  const identityBadges = badges.filter(b => b.layer === 'identity');
  const currentIdentityBadge = profileBadges.identity?.badge;
  const nextIdentityBadge = identityBadges.find(b => 
    (b.progressionOrder || 0) > (currentIdentityBadge?.progressionOrder || 0)
  );
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.section 
          className="card-professional p-6 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Identity Badge (Large) */}
            <div className="flex-shrink-0">
              {profileBadges.identity ? (
                <BadgeCard 
                  badge={profileBadges.identity.badge!}
                  unlock={profileBadges.identity}
                  size="lg"
                  showDetails={false}
                  onClick={() => setSelectedBadge({
                    badge: profileBadges.identity!.badge!,
                    unlock: profileBadges.identity!
                  })}
                />
              ) : (
                <div className="w-36 h-36 rounded-lg bg-muted/50 flex items-center justify-center">
                  <JazziconAvatar address={address || ''} diameter={80} />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-mono">Wallet</p>
              <p className="text-lg font-mono mb-2">{truncatedAddress}</p>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="text-sm font-medium text-primary">
                  {currentIdentityBadge?.name || 'Unranked'}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-display font-bold text-gradient-ocean">
                  {scoreDisplay}
                </span>
                <span className="text-muted-foreground">/ 10</span>
                <span className="text-sm text-muted-foreground">Intent Score</span>
              </div>
              
              {/* Progress to next identity badge */}
              {nextIdentityBadge && nextMilestones.length > 0 && (
                <ProgressBar
                  current={nextMilestones[0]?.currentValue || 0}
                  target={nextMilestones[0]?.targetValue || 1}
                  label={`Progress to ${nextIdentityBadge.name}`}
                  size="sm"
                />
              )}
            </div>
          </div>
        </motion.section>
        
        {/* Stats Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard 
            label="Transactions"
            value={progress?.totalTransactions || 0}
            change={progress?.totalTransactions ? `+${Math.min(progress.totalTransactions, 12)} this week` : undefined}
            icon={Activity}
          />
          <StatsCard 
            label="Protocols"
            value={progress?.uniqueProtocols || 0}
            icon={Layers}
          />
          <StatsCard 
            label="Active Days"
            value={progress?.consecutiveDays || 0}
            change={progress?.maxConsecutiveDays ? `Max: ${progress.maxConsecutiveDays}` : undefined}
            icon={Clock}
          />
        </section>
        
        {/* Credentials (Proof Badges) */}
        <section className="mb-8">
          <h2 className="section-header">Credentials</h2>
          <div className="grid grid-cols-3 gap-4">
            {badges.filter(b => b.layer === 'proof').map(badge => {
              const unlock = unlocks.find(u => u.badgeId === badge.id);
              return (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlock={unlock}
                  size="sm"
                  onClick={() => unlock && setSelectedBadge({ badge, unlock })}
                />
              );
            })}
          </div>
        </section>
        
        {/* Event Badges */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0">Event Badges</h2>
            <Link 
              to="/badges" 
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {profileBadges.event.length > 0 ? (
              profileBadges.event.map(unlock => (
                <BadgeCard
                  key={unlock.id}
                  badge={unlock.badge!}
                  unlock={unlock}
                  size="sm"
                  onClick={() => setSelectedBadge({ badge: unlock.badge!, unlock })}
                />
              ))
            ) : (
              badges.filter(b => b.layer === 'event').slice(0, 3).map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  size="sm"
                />
              ))
            )}
          </div>
        </section>
        
        {/* Next Milestones */}
        {nextMilestones.length > 0 && (
          <section className="mb-8">
            <h2 className="section-header">Next Milestones</h2>
            <div className="card-professional p-4 space-y-4">
              {nextMilestones.map(milestone => (
                <div key={milestone.badge.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{milestone.badge.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {milestone.description}
                    </span>
                  </div>
                  <ProgressBar
                    current={milestone.currentValue}
                    target={milestone.targetValue}
                    showPercentage={false}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Activity Timeline Placeholder */}
        <section>
          <h2 className="section-header">Recent Activity</h2>
          <div className="card-professional p-4">
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Activity timeline coming soon</p>
              <p className="text-xs mt-1">Your on-chain actions will appear here</p>
            </div>
          </div>
        </section>
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