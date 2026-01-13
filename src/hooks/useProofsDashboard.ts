/**
 * Hook for managing proofs dashboard data
 * Fetches proofs from the nfts table with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';

export interface DashboardProof {
  id: string;
  campaign_id: string;
  wallet_address: string;
  status: string;
  created_at: string;
  minted_at: string | null;
  verified_at: string | null;
  intent_category: number | null;
  intent_fingerprint: string | null;
  proof_cost: number | null;
  token_id: string | null;
  tx_hash: string | null;
  metadata_hash: string | null;
  campaign: {
    id: string;
    campaign_type: string;
    caption: string;
    image_url: string | null;
    arc_context: string[];
  } | null;
}

export interface ProofStats {
  totalProofs: number;
  uniqueUsers: number;
  userProofs: number;
  verifiedCount: number;
}

export const useProofsDashboard = () => {
  const { address } = useWallet();
  const [proofs, setProofs] = useState<DashboardProof[]>([]);
  const [stats, setStats] = useState<ProofStats>({
    totalProofs: 0,
    uniqueUsers: 0,
    userProofs: 0,
    verifiedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProofs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch proofs with campaign data
      const { data: proofsData, error: proofsError } = await supabase
        .from('nfts')
        .select(`
          id,
          campaign_id,
          wallet_address,
          status,
          created_at,
          minted_at,
          verified_at,
          intent_category,
          intent_fingerprint,
          proof_cost,
          token_id,
          tx_hash,
          metadata_hash,
          campaigns!inner (
            id,
            campaign_type,
            caption,
            image_url,
            arc_context
          )
        `)
        .order('created_at', { ascending: false });

      if (proofsError) {
        throw proofsError;
      }

      // Transform the data
      const transformedProofs: DashboardProof[] = (proofsData || []).map((proof: any) => ({
        id: proof.id,
        campaign_id: proof.campaign_id,
        wallet_address: proof.wallet_address,
        status: proof.status,
        created_at: proof.created_at,
        minted_at: proof.minted_at,
        verified_at: proof.verified_at,
        intent_category: proof.intent_category,
        intent_fingerprint: proof.intent_fingerprint,
        proof_cost: proof.proof_cost,
        token_id: proof.token_id,
        tx_hash: proof.tx_hash,
        metadata_hash: proof.metadata_hash,
        campaign: proof.campaigns ? {
          id: proof.campaigns.id,
          campaign_type: proof.campaigns.campaign_type,
          caption: proof.campaigns.caption,
          image_url: proof.campaigns.image_url,
          arc_context: proof.campaigns.arc_context,
        } : null,
      }));

      setProofs(transformedProofs);

      // Calculate stats
      const uniqueWallets = new Set(transformedProofs.map(p => p.wallet_address.toLowerCase()));
      const userProofsCount = address 
        ? transformedProofs.filter(p => p.wallet_address.toLowerCase() === address.toLowerCase()).length 
        : 0;
      const verifiedCount = transformedProofs.filter(p => p.verified_at !== null).length;

      setStats({
        totalProofs: transformedProofs.length,
        uniqueUsers: uniqueWallets.size,
        userProofs: userProofsCount,
        verifiedCount,
      });
    } catch (err) {
      console.error('Error fetching proofs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch proofs');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Initial fetch
  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('proofs-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nfts',
        },
        () => {
          // Refetch on any change
          fetchProofs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProofs]);

  // Get proofs for current user only
  const userProofs = address
    ? proofs.filter(p => p.wallet_address.toLowerCase() === address.toLowerCase())
    : [];

  return {
    proofs,
    userProofs,
    stats,
    loading,
    error,
    refetch: fetchProofs,
  };
};