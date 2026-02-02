import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Badge, BadgeUnlock, UserBadgeProgress, ProfileBadges, BadgeProgress } from '@/shared/types/badge';
import { useWallet } from '@/contexts/WalletContext';

// Transform database row to Badge type
function transformBadge(row: any): Badge {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    layer: row.layer,
    rarity: row.rarity,
    visualConfig: row.visual_config || {},
    criteria: row.criteria || {},
    isProgression: row.is_progression,
    progressionOrder: row.progression_order,
    isActive: row.is_active,
    eventWindowStart: row.event_window_start,
    eventWindowEnd: row.event_window_end,
  };
}

// Transform database row to BadgeUnlock type
function transformUnlock(row: any): BadgeUnlock {
  return {
    id: row.id,
    badgeId: row.badge_id,
    badge: row.badges ? transformBadge(row.badges) : undefined,
    unlockedAt: row.unlocked_at,
    triggerTxHash: row.trigger_tx_hash,
    triggerEvent: row.trigger_event,
    proofData: row.proof_data,
    isDisplayed: row.is_displayed,
    displayOrder: row.display_order,
  };
}

// Transform database row to UserBadgeProgress type
function transformProgress(row: any): UserBadgeProgress {
  return {
    id: row.id,
    userId: row.user_id,
    walletAddress: row.wallet_address,
    totalTransactions: row.total_transactions,
    uniqueProtocols: row.unique_protocols,
    protocolsInteracted: row.protocols_interacted || [],
    consecutiveDays: row.consecutive_days,
    lastActiveDate: row.last_active_date,
    maxConsecutiveDays: row.max_consecutive_days,
    socialShares: row.social_shares,
    totalEngagement: row.total_engagement,
    voiceState: row.voice_state,
    intentScore: parseFloat(row.intent_score) || 0,
    currentIdentityBadge: row.current_identity_badge,
  };
}

// Fetch all badge definitions
export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async (): Promise<Badge[]> => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('layer')
        .order('progression_order', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return (data || []).map(transformBadge);
    },
  });
}

// Fetch user's badge unlocks
export function useUserBadgeUnlocks() {
  const { address } = useWallet();
  
  return useQuery({
    queryKey: ['badge-unlocks', address],
    queryFn: async (): Promise<BadgeUnlock[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];
      
      const { data, error } = await supabase
        .from('badge_unlocks')
        .select(`
          *,
          badges (*)
        `)
        .eq('user_id', session.user.id)
        .order('unlocked_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(transformUnlock);
    },
    enabled: !!address,
  });
}

// Fetch user's badge progress
export function useUserBadgeProgress() {
  const { address } = useWallet();
  
  return useQuery({
    queryKey: ['badge-progress', address],
    queryFn: async (): Promise<UserBadgeProgress | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from('user_badge_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data ? transformProgress(data) : null;
    },
    enabled: !!address,
  });
}

// Get organized profile badges
export function useProfileBadges(): ProfileBadges {
  const { data: badges = [] } = useBadges();
  const { data: unlocks = [] } = useUserBadgeUnlocks();
  
  // Group unlocks by badge layer
  const unlocksByBadge = new Map(unlocks.map(u => [u.badgeId, u]));
  
  // Identity: Get highest unlocked progression badge
  const identityBadges = badges
    .filter(b => b.layer === 'identity')
    .sort((a, b) => (b.progressionOrder || 0) - (a.progressionOrder || 0));
  
  const identityUnlock = identityBadges
    .map(b => unlocksByBadge.get(b.id))
    .find(u => u !== undefined) || null;
  
  // Proof: All proof badge unlocks
  const proofUnlocks = unlocks.filter(u => u.badge?.layer === 'proof');
  
  // Event: Top 3 displayed event badges
  const eventUnlocks = unlocks
    .filter(u => u.badge?.layer === 'event' && u.isDisplayed)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .slice(0, 3);
  
  // Social: Voice badge
  const socialUnlock = unlocks.find(u => u.badge?.layer === 'social') || null;
  
  return {
    identity: identityUnlock,
    proof: proofUnlocks,
    event: eventUnlocks,
    social: socialUnlock,
  };
}

// Calculate progress towards next badges
export function useBadgeProgressList(): BadgeProgress[] {
  const { data: badges = [] } = useBadges();
  const { data: progress } = useUserBadgeProgress();
  const { data: unlocks = [] } = useUserBadgeUnlocks();
  
  if (!progress) return [];
  
  const unlockedBadgeIds = new Set(unlocks.map(u => u.badgeId));
  const progressList: BadgeProgress[] = [];
  
  for (const badge of badges) {
    if (unlockedBadgeIds.has(badge.id)) continue;
    
    const criteria = badge.criteria as Record<string, number>;
    let currentValue = 0;
    let targetValue = 0;
    let description = '';
    
    // Calculate based on criteria
    if (criteria.min_transactions) {
      currentValue = progress.totalTransactions;
      targetValue = criteria.min_transactions;
      description = `${currentValue}/${targetValue} transactions`;
    } else if (criteria.min_consecutive_days) {
      currentValue = progress.consecutiveDays;
      targetValue = criteria.min_consecutive_days;
      description = `${currentValue}/${targetValue} consecutive days`;
    } else if (criteria.min_protocols) {
      currentValue = progress.uniqueProtocols;
      targetValue = criteria.min_protocols;
      description = `${currentValue}/${targetValue} protocols`;
    }
    
    if (targetValue > 0) {
      progressList.push({
        badge,
        currentValue,
        targetValue,
        percentage: Math.min((currentValue / targetValue) * 100, 100),
        description,
      });
    }
  }
  
  // Sort by percentage (closest to completion first)
  return progressList.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
}