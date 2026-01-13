/**
 * Proof Service - Frontend service layer for intent proof operations
 * Handles proof recording and verification for on-chain reference
 */

import { supabase } from '@/integrations/supabase/client';
import { IntentCategory } from './campaignService';

export interface RecordProofParams {
  campaignId: string;
  userAddress: string;
  intentCategory?: IntentCategory;
  targetDApps?: string[];
  actionOrder?: string[];
  txHash?: string;
}

export interface VerifyProofParams {
  campaignId: string;
  userAddress: string;
  providedHash: string;
}

export interface IntentProof {
  proofId: string;
  campaignId: string;
  userAddress: string;
  campaignHash: string;
  intentFingerprint: string;
  intentCategory: IntentCategory;
  targetDApps: string[];
  actionOrder: string[];
  timestamp: number;
  txHash: string | null;
  campaign?: {
    id: string;
    caption: string;
    image_url: string | null;
    campaign_type: string;
  };
}

export interface ProofStats {
  totalProofs: number;
  uniqueUsers: number;
  userProofs?: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ProofServiceImpl {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intent-proof-service`;
  }

  /**
   * Record a new proof (requires ownership verification)
   */
  async record(params: RecordProofParams): Promise<ServiceResponse<{ proof: IntentProof }>> {
    try {
      const { data, error } = await supabase.functions.invoke('intent-proof-service/record', {
        body: {
          campaignId: params.campaignId,
          userAddress: params.userAddress,
          intentCategory: params.intentCategory,
          targetDApps: params.targetDApps,
          actionOrder: params.actionOrder,
          txHash: params.txHash,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record proof';
      console.error('[ProofService] Record error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Get proofs (by campaign or user)
   */
  async get(params: { campaignId?: string; userAddress?: string }): Promise<ServiceResponse<{ proofs: IntentProof[] }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params.campaignId) queryParams.set('campaignId', params.campaignId);
      if (params.userAddress) queryParams.set('userAddress', params.userAddress.toLowerCase());

      const response = await fetch(
        `${this.baseUrl}/get?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to fetch proofs' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch proofs';
      console.error('[ProofService] Get error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Get proofs for current user
   */
  async getMyProofs(userAddress: string): Promise<ServiceResponse<{ proofs: IntentProof[] }>> {
    return this.get({ userAddress });
  }

  /**
   * Verify a proof hash
   */
  async verify(params: VerifyProofParams): Promise<ServiceResponse<{ valid: boolean; proofExists: boolean }>> {
    try {
      const { data, error } = await supabase.functions.invoke('intent-proof-service/verify', {
        body: {
          campaignId: params.campaignId,
          userAddress: params.userAddress,
          providedHash: params.providedHash,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify proof';
      console.error('[ProofService] Verify error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Get proof statistics
   */
  async getStats(userAddress?: string): Promise<ServiceResponse<{ stats: ProofStats }>> {
    try {
      const queryParams = new URLSearchParams();
      if (userAddress) queryParams.set('userAddress', userAddress.toLowerCase());

      const response = await fetch(
        `${this.baseUrl}/stats?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to fetch stats' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      console.error('[ProofService] GetStats error:', err);
      return { success: false, error: message };
    }
  }
}

export const proofService = new ProofServiceImpl();
