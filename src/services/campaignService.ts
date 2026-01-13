/**
 * Campaign Service - Frontend service layer for campaign operations
 * All mutations require wallet ownership verification via edge functions
 */

import { supabase } from '@/integrations/supabase/client';

// Campaign States (matches backend state machine)
export enum CampaignState {
  DRAFT = 'draft',
  GENERATED = 'generated',
  FINALIZED = 'finalized',
  SHARED = 'shared'
}

// Intent Categories (matches on-chain enum)
export enum IntentCategory {
  Builder = 0,
  DeFi = 1,
  Social = 2,
  Infrastructure = 3
}

export interface CreateCampaignParams {
  walletAddress: string;
  campaignType: string;
  arcContext: string[];
  tones: string[];
  customInput?: string;
  imageStyle: string;
  intent?: {
    category: IntentCategory;
    targetDApps: string[];
    actionOrder: string[];
    timeWindow: 'none' | '24h' | '1week' | '1month';
  };
}

export interface TransitionCampaignParams {
  campaignId: string;
  fromState: CampaignState;
  toState: CampaignState;
  walletAddress: string;
}

export interface Campaign {
  id: string;
  wallet_address: string;
  campaign_type: string;
  arc_context: string[];
  tones: string[];
  custom_input: string | null;
  image_style: string;
  caption: string;
  caption_hash: string;
  image_url: string | null;
  image_status: string;
  status: CampaignState;
  created_at: string;
  updated_at: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class CampaignServiceImpl {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-service`;
  }

  /**
   * Create a new campaign (DRAFT state)
   */
  async create(params: CreateCampaignParams): Promise<ServiceResponse<{ campaign: Campaign; fingerprint?: string }>> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign-service/create', {
        body: {
          walletAddress: params.walletAddress,
          campaignType: params.campaignType,
          arcContext: params.arcContext,
          tones: params.tones,
          customInput: params.customInput,
          imageStyle: params.imageStyle,
          intent: params.intent,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
      console.error('[CampaignService] Create error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Transition campaign state (requires ownership verification)
   */
  async transition(params: TransitionCampaignParams): Promise<ServiceResponse<{ campaign: Campaign }>> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign-service/transition', {
        body: {
          campaignId: params.campaignId,
          fromState: params.fromState,
          toState: params.toState,
          walletAddress: params.walletAddress,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transition campaign';
      console.error('[CampaignService] Transition error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Get campaign by ID (public read)
   */
  async getById(campaignId: string): Promise<ServiceResponse<{ campaign: Campaign | null }>> {
    try {
      const { data, error } = await supabase.functions.invoke('campaign-service/get', {
        body: {},
        method: 'GET',
      });

      // Use direct fetch for GET with query params
      const response = await fetch(
        `${this.baseUrl}/get?id=${campaignId}`,
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
        return { success: false, error: errorData.error || 'Failed to fetch campaign' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch campaign';
      console.error('[CampaignService] Get error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Get campaigns by wallet address (owner's campaigns)
   */
  async getByWallet(walletAddress: string): Promise<ServiceResponse<{ campaigns: Campaign[] }>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/get?wallet=${walletAddress.toLowerCase()}`,
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
        return { success: false, error: errorData.error || 'Failed to fetch campaigns' };
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      console.error('[CampaignService] GetByWallet error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Check if wallet owns a campaign
   */
  async verifyOwnership(campaignId: string, walletAddress: string): Promise<boolean> {
    try {
      const result = await this.getById(campaignId);
      if (!result.success || !result.data?.campaign) {
        return false;
      }
      return result.data.campaign.wallet_address.toLowerCase() === walletAddress.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Check if campaign is in editable state
   */
  isEditable(status: CampaignState): boolean {
    return status === CampaignState.DRAFT || status === CampaignState.GENERATED;
  }

  /**
   * Check if campaign is frozen (finalized or shared)
   */
  isFrozen(status: CampaignState): boolean {
    return status === CampaignState.FINALIZED || status === CampaignState.SHARED;
  }
}

export const campaignService = new CampaignServiceImpl();
