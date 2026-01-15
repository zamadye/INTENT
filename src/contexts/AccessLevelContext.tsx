import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';

export type AccessTier = 'base' | 'active' | 'advanced';

export interface AccessLevel {
  tier: AccessTier;
  completedCampaigns: number;
  unlockedFeatures: string[];
  nextUnlock: {
    tier: AccessTier;
    requiresCampaigns: number;
    remaining: number;
    features: string[];
  } | null;
}

interface AccessLevelContextType {
  accessLevel: AccessLevel;
  loading: boolean;
  refreshAccessLevel: () => Promise<void>;
  isFeatureUnlocked: (feature: string) => boolean;
}

const BASE_FEATURES = ['basic_campaigns', 'public_gallery', 'view_proofs'];
const ACTIVE_FEATURES = ['unlimited_campaigns', 'advanced_ai', 'all_intent_categories', 'orchestration_mode'];
const ADVANCED_FEATURES = ['custom_prompts', 'analytics', 'templates', 'data_export'];

const defaultAccessLevel: AccessLevel = {
  tier: 'base',
  completedCampaigns: 0,
  unlockedFeatures: BASE_FEATURES,
  nextUnlock: {
    tier: 'active',
    requiresCampaigns: 1,
    remaining: 1,
    features: ACTIVE_FEATURES,
  },
};

const AccessLevelContext = createContext<AccessLevelContextType>({
  accessLevel: defaultAccessLevel,
  loading: true,
  refreshAccessLevel: async () => {},
  isFeatureUnlocked: () => false,
});

export const useAccessLevel = () => useContext(AccessLevelContext);

export const AccessLevelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useWallet();
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(defaultAccessLevel);
  const [loading, setLoading] = useState(true);

  const calculateAccessLevel = useCallback((completedCount: number): AccessLevel => {
    let tier: AccessTier = 'base';
    let unlockedFeatures: string[] = [...BASE_FEATURES];
    let nextUnlock: AccessLevel['nextUnlock'] = null;

    if (completedCount >= 3) {
      tier = 'advanced';
      unlockedFeatures = [...BASE_FEATURES, ...ACTIVE_FEATURES, ...ADVANCED_FEATURES];
      nextUnlock = null; // Max level
    } else if (completedCount >= 1) {
      tier = 'active';
      unlockedFeatures = [...BASE_FEATURES, ...ACTIVE_FEATURES];
      nextUnlock = {
        tier: 'advanced',
        requiresCampaigns: 3,
        remaining: 3 - completedCount,
        features: ADVANCED_FEATURES,
      };
    } else {
      tier = 'base';
      unlockedFeatures = BASE_FEATURES;
      nextUnlock = {
        tier: 'active',
        requiresCampaigns: 1,
        remaining: 1,
        features: ACTIVE_FEATURES,
      };
    }

    return {
      tier,
      completedCampaigns: completedCount,
      unlockedFeatures,
      nextUnlock,
    };
  }, []);

  const refreshAccessLevel = useCallback(async () => {
    if (!address || !isConnected) {
      setAccessLevel(defaultAccessLevel);
      setLoading(false);
      return;
    }

    try {
      // Count finalized/shared campaigns for this wallet (fully completed campaigns)
      const { count, error } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address', address.toLowerCase())
        .in('status', ['finalized', 'shared']);

      if (error) {
        console.error('Error fetching completed campaigns:', error);
        setAccessLevel(defaultAccessLevel);
      } else {
        const completedCount = count || 0;
        setAccessLevel(calculateAccessLevel(completedCount));
      }
    } catch (error) {
      console.error('Error calculating access level:', error);
      setAccessLevel(defaultAccessLevel);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, calculateAccessLevel]);

  useEffect(() => {
    refreshAccessLevel();
  }, [refreshAccessLevel]);

  const isFeatureUnlocked = useCallback((feature: string): boolean => {
    return accessLevel.unlockedFeatures.includes(feature);
  }, [accessLevel.unlockedFeatures]);

  return (
    <AccessLevelContext.Provider value={{ accessLevel, loading, refreshAccessLevel, isFeatureUnlocked }}>
      {children}
    </AccessLevelContext.Provider>
  );
};