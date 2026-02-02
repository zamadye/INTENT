// =============================================
// INTENT Platform - Badge System Types
// =============================================

export type BadgeLayer = 'identity' | 'proof' | 'event' | 'social';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  layer: BadgeLayer;
  rarity: BadgeRarity;
  visualConfig: {
    nodes?: number;
    glow?: 'minimal' | 'basic' | 'medium' | 'full' | 'maximum';
    pattern?: string;
    style?: string;
    accent?: string;
    nodesByState?: number[];
    glowByState?: string[];
  };
  criteria: Record<string, unknown>;
  isProgression: boolean;
  progressionOrder?: number;
  isActive: boolean;
  eventWindowStart?: string;
  eventWindowEnd?: string;
}

export interface BadgeUnlock {
  id: string;
  badgeId: string;
  badge?: Badge;
  unlockedAt: string;
  triggerTxHash?: string;
  triggerEvent?: string;
  proofData?: Record<string, unknown>;
  isDisplayed: boolean;
  displayOrder?: number;
}

export interface UserBadgeProgress {
  id: string;
  userId: string;
  walletAddress: string;
  
  // Identity badge stats
  totalTransactions: number;
  uniqueProtocols: number;
  protocolsInteracted: string[];
  consecutiveDays: number;
  lastActiveDate?: string;
  maxConsecutiveDays: number;
  
  // Social badge stats (Voice)
  socialShares: number;
  totalEngagement: number;
  voiceState: 0 | 1 | 2 | 3;
  
  // Computed
  intentScore: number;
  currentIdentityBadge?: string;
}

// Badge display categories for profile
export interface ProfileBadges {
  identity: BadgeUnlock | null; // Current identity badge (replaces previous)
  proof: BadgeUnlock[]; // All proof badges (displayed together)
  event: BadgeUnlock[]; // Top 3 selected event badges
  social: BadgeUnlock | null; // Voice badge with current state
}

// Progress towards next badge
export interface BadgeProgress {
  badge: Badge;
  currentValue: number;
  targetValue: number;
  percentage: number;
  description: string;
}

// Badge unlock notification
export interface BadgeUnlockNotification {
  badge: Badge;
  unlockedAt: string;
  triggerTxHash?: string;
}