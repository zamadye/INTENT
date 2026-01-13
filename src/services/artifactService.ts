/**
 * Artifact Service - Frontend service layer for artifact operations
 * Handles content validation, mandatory link injection, and hash freezing
 */

import { supabase } from '@/integrations/supabase/client';

export interface GenerateArtifactParams {
  campaignId: string;
  rawCaption: string;
  targetDApps?: string[];
  walletAddress: string;
}

export interface FinalizeArtifactParams {
  campaignId: string;
  imageUrl?: string;
  walletAddress: string;
}

export interface VerifyArtifactParams {
  campaignId: string;
  providedHash: string;
}

export interface Artifact {
  campaignId: string;
  caption: string;
  captionHash: string;
  imageUrl?: string;
  artifactHash?: string;
  finalizedAt?: string;
  immutable?: boolean;
}

export interface SharePayload {
  campaignId: string;
  caption: string;
  imageUrl: string | null;
  captionHash: string;
  artifactHash: string;
  publicUrl: string;
  createdAt: string;
  frozen: boolean;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  violations?: string[];
}

class ArtifactServiceImpl {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/artifact-service`;
  }

  /**
   * Generate artifact (caption with mandatory content injection)
   * Validates content and returns processed caption with hash
   */
  async generate(params: GenerateArtifactParams): Promise<ServiceResponse<{ artifact: Artifact }>> {
    try {
      const { data, error } = await supabase.functions.invoke('artifact-service/generate', {
        body: {
          campaignId: params.campaignId,
          rawCaption: params.rawCaption,
          targetDApps: params.targetDApps,
          walletAddress: params.walletAddress,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.error) {
        return { 
          success: false, 
          error: data.error,
          violations: data.violations 
        };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate artifact';
      console.error('[ArtifactService] Generate error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Finalize artifact (freeze content - becomes immutable)
   * After finalization, no edits are possible
   */
  async finalize(params: FinalizeArtifactParams): Promise<ServiceResponse<{ artifact: Artifact }>> {
    try {
      const { data, error } = await supabase.functions.invoke('artifact-service/finalize', {
        body: {
          campaignId: params.campaignId,
          imageUrl: params.imageUrl,
          walletAddress: params.walletAddress,
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
      const message = err instanceof Error ? err.message : 'Failed to finalize artifact';
      console.error('[ArtifactService] Finalize error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Verify artifact hash integrity
   */
  async verify(params: VerifyArtifactParams): Promise<ServiceResponse<{ valid: boolean; calculatedHash: string }>> {
    try {
      const { data, error } = await supabase.functions.invoke('artifact-service/verify', {
        body: {
          campaignId: params.campaignId,
          providedHash: params.providedHash,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify artifact';
      console.error('[ArtifactService] Verify error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Get share payload for a finalized campaign
   */
  async getSharePayload(campaignId: string): Promise<ServiceResponse<{ sharePayload: SharePayload }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/get-share-payload?id=${campaignId}`,
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
        return { success: false, error: errorData.error || 'Failed to get share payload' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get share payload';
      console.error('[ArtifactService] GetSharePayload error:', err);
      return { success: false, error: message };
    }
  }
}

export const artifactService = new ArtifactServiceImpl();
