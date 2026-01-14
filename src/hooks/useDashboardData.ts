import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';

export interface Campaign {
  id: string;
  thumbnail: string | null;
  caption: string;
  type: string;
  status: string;
  createdAt: Date;
  imageUrl: string | null;
}

export interface ActivityItem {
  type: 'completed' | 'created' | 'minted';
  description: string;
  timestamp: Date;
  campaignId?: string;
}

export function useDashboardData() {
  const { address, isConnected } = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!address || !isConnected) {
      setCampaigns([]);
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch campaigns for current wallet
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('wallet_address', address)
        .order('created_at', { ascending: false });

      if (campaignError) {
        throw campaignError;
      }

      // Transform campaign data
      const transformedCampaigns: Campaign[] = (campaignData || []).map(c => ({
        id: c.id,
        thumbnail: c.image_url,
        caption: c.caption || '',
        type: c.campaign_type || 'Unknown',
        status: c.status || 'draft',
        createdAt: new Date(c.created_at),
        imageUrl: c.image_url,
      }));

      setCampaigns(transformedCampaigns);

      // Fetch NFTs for activity
      const { data: nftData, error: nftError } = await supabase
        .from('nfts')
        .select('*')
        .eq('wallet_address', address)
        .order('created_at', { ascending: false });

      if (nftError) {
        console.warn('Error fetching NFTs:', nftError);
      }

      // Build activity timeline from campaigns and NFTs
      const campaignActivities: ActivityItem[] = transformedCampaigns.map(c => ({
        type: c.status === 'completed' ? 'completed' : 'created',
        description: c.status === 'completed' 
          ? `Completed campaign "${c.caption.substring(0, 30)}..."`
          : `Created campaign draft`,
        timestamp: c.createdAt,
        campaignId: c.id,
      }));

      const nftActivities: ActivityItem[] = (nftData || []).map(n => ({
        type: 'minted' as const,
        description: `Intent proof generated`,
        timestamp: new Date(n.minted_at || n.created_at),
        campaignId: n.campaign_id,
      }));

      // Merge and sort activities by timestamp
      const allActivities = [...campaignActivities, ...nftActivities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10); // Limit to 10 most recent

      setActivities(allActivities);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    activities,
    isLoading,
    error,
    refetch: fetchCampaigns,
    isEmpty: campaigns.length === 0,
  };
}
