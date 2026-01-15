import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';

export interface ProofItem {
  id: string;
  campaign_id: string;
  wallet_address: string;
  status: string;
  created_at: string;
  intent_category: string | null;
  fingerprint: string | null;
  dapp_list: string[] | null;
  action_order: string[] | null;
  tx_hash: string | null;
  views_count: number;
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

export const useProofs = () => {
  const { address } = useWallet();
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProofs = useCallback(async () => {
    setLoading(true);
    
    // SECURITY: Require authenticated session before querying
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Not authenticated - cannot query user's proofs
      setProofs([]);
      setLoading(false);
      return;
    }

    // Fetch finalized/shared campaigns for the authenticated user
    // RLS enforces auth.uid() = user_id - only returns user's own campaigns
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['finalized', 'shared'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proofs:', error);
      setLoading(false);
      return;
    }

    // Transform campaigns to proof format
    const transformedProofs: ProofItem[] = (data || []).map((campaign) => ({
      id: campaign.id,
      campaign_id: campaign.id,
      wallet_address: campaign.wallet_address,
      status: 'completed',
      created_at: campaign.created_at,
      intent_category: campaign.campaign_type === 'product-launch' || campaign.campaign_type === 'defi-promotion' 
        ? 'defi' 
        : campaign.campaign_type === 'educational' 
        ? 'social' 
        : campaign.campaign_type === 'community-event'
        ? 'social'
        : 'builder',
      fingerprint: campaign.caption_hash,
      dapp_list: campaign.arc_context || [],
      action_order: [],
      tx_hash: null,
      views_count: 0,
      campaign: {
        id: campaign.id,
        campaign_type: campaign.campaign_type,
        caption: campaign.caption,
        image_url: campaign.image_url,
        image_style: campaign.image_style,
        created_at: campaign.created_at,
        wallet_address: campaign.wallet_address,
      },
    }));

    setProofs(transformedProofs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  const incrementViews = async (proofId: string) => {
    // For now, just log - could track views in a separate table later
    console.log('Viewed proof:', proofId);
  };

  return {
    proofs,
    loading,
    incrementViews,
    refetch: fetchProofs,
  };
};
