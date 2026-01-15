import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

interface CampaignData {
  campaignType: string;
  tones: string[];
  arcContext: string[];
  customInput: string;
  imageStyle: string;
  intentCategory?: string;
  targetDApps?: string[];
  actionOrder?: string[];
  timeWindow?: string;
}

export interface GeneratedCampaign {
  id: string;
  caption: string;
  imageUrl: string | null;
  imageStatus: 'pending' | 'generating' | 'completed' | 'failed';
  captionHash?: string;
  imagePrompt?: string;
  generationMetadata?: {
    campaignType: string;
    imageStyle: string;
    targetDApps: string[];
    attempts: number;
    generatedAt: string;
    hasArcFlowMention: boolean;
    actionOrder?: string[];
    timeWindow?: string;
  };
}

// Simple hash function for caption deduplication
async function hashCaption(caption: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(caption.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate fingerprint from intent data
async function generateFingerprint(campaignData: CampaignData): Promise<string> {
  const intentData = {
    category: campaignData.intentCategory || '',
    dApps: (campaignData.targetDApps || []).sort(),
    actions: campaignData.actionOrder || [],
    timeWindow: campaignData.timeWindow || 'none'
  };
  
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(intentData));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate @ArcFlowFinance mention
function validateArcFlowMention(caption: string): boolean {
  return caption.includes('@ArcFlowFinance');
}

// Inject @ArcFlowFinance if missing (client-side fallback)
function injectArcFlowMention(caption: string): string {
  if (caption.includes('@ArcFlowFinance')) {
    return caption;
  }
  
  const sentences = caption.split('. ');
  if (sentences.length > 1) {
    sentences[0] += ' via @ArcFlowFinance';
    return sentences.join('. ');
  }
  
  if (caption.includes('#')) {
    return caption.replace(/#/, '@ArcFlowFinance #');
  }
  
  return caption + ' @ArcFlowFinance';
}

export function useCampaignGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateCampaign = useCallback(async (
    campaignData: CampaignData,
    walletAddress: string | null
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      // ========================================
      // UNIFIED GENERATION: Caption + Image Prompt together
      // ========================================
      console.log('🔵 Unified generation: Creating caption + image prompt...');
      
      const unifiedResponse = await supabase.functions.invoke('generate-unified', {
        body: {
          campaignType: campaignData.campaignType,
          tones: campaignData.tones,
          arcContext: campaignData.arcContext,
          customInput: campaignData.customInput,
          imageStyle: campaignData.imageStyle,
          targetDApps: campaignData.targetDApps,
          intentCategory: campaignData.intentCategory,
          actionOrder: campaignData.actionOrder,
          timeWindow: campaignData.timeWindow,
          walletAddress,
        }
      });

      if (unifiedResponse.error) {
        throw new Error(unifiedResponse.error.message || 'Failed to generate campaign');
      }

      let { caption, imagePrompt, metadata } = unifiedResponse.data;
      
      if (!caption) {
        throw new Error('No caption received from AI');
      }

      // Client-side validation of @ArcFlowFinance (safety net)
      if (!validateArcFlowMention(caption)) {
        console.warn('Caption missing @ArcFlowFinance, applying client fallback');
        caption = injectArcFlowMention(caption);
      }

      const captionHash = await hashCaption(caption);
      const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build generation metadata for auditing
      const generationMetadata = {
        ...metadata,
        actionOrder: campaignData.actionOrder,
        timeWindow: campaignData.timeWindow,
      };

      // Set initial state with caption and metadata
      setGeneratedCampaign({
        id: campaignId,
        caption,
        imageUrl: null,
        imageStatus: 'generating',
        captionHash,
        imagePrompt,
        generationMetadata
      });

      toast.success('Caption generated!', { icon: '✍️' });
      console.log('✅ Caption ready:', caption.substring(0, 50) + '...');
      console.log('✅ @ArcFlowFinance included:', validateArcFlowMention(caption));

      // ========================================
      // IMAGE GENERATION: Use the unified image prompt
      // ========================================
      console.log('🟢 Generating image from unified prompt...');
      
      const imageResponse = await supabase.functions.invoke('generate-image', {
        body: {
          caption,
          imageStyle: campaignData.imageStyle,
          campaignType: campaignData.campaignType,
          visualPrompt: imagePrompt // Use the AI-generated visual prompt
        }
      });

      if (imageResponse.error) {
        console.error('Image generation failed:', imageResponse.error);
        setGeneratedCampaign(prev => prev ? {
          ...prev,
          imageStatus: 'failed'
        } : null);
        toast.error('Image generation failed, but caption is ready!');
      } else {
        const { imageUrl } = imageResponse.data;
        setGeneratedCampaign(prev => prev ? {
          ...prev,
          imageUrl,
          imageStatus: 'completed'
        } : null);
        toast.success('Image generated!', { icon: '🎨' });
        console.log('✅ Image generated successfully');
      }

      return { success: true, campaignId };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Campaign generation failed';
      console.error('Campaign generation error:', err);
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const regenerateCampaign = useCallback(async (
    campaignData: CampaignData,
    walletAddress: string | null
  ) => {
    setGeneratedCampaign(null);
    return generateCampaign(campaignData, walletAddress);
  }, [generateCampaign]);

  const updateCaption = useCallback(async (newCaption: string) => {
    // Validate @ArcFlowFinance before allowing update
    if (!validateArcFlowMention(newCaption)) {
      toast.error('Caption must include @ArcFlowFinance mention');
      return false;
    }
    
    if (generatedCampaign) {
      const captionHash = await hashCaption(newCaption);
      setGeneratedCampaign({
        ...generatedCampaign,
        caption: newCaption,
        captionHash
      });
      return true;
    }
    return false;
  }, [generatedCampaign]);

  const completeCampaign = useCallback(async (
    campaignData: CampaignData,
    walletAddress: string
  ) => {
    if (!generatedCampaign) {
      throw new Error('No campaign to complete');
    }

    setIsCompleting(true);
    setError(null);

    try {
      // SECURITY: Get authenticated user for edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required to save campaign');
      }

      // Generate fingerprint from intent data
      const fingerprint = await generateFingerprint(campaignData);
      
      // Use edge function instead of direct database insert for validation
      const response = await supabase.functions.invoke('campaign-service/save', {
        body: {
          walletAddress,
          campaignType: campaignData.campaignType,
          tones: campaignData.tones,
          arcContext: campaignData.arcContext,
          customInput: campaignData.customInput,
          imageStyle: campaignData.imageStyle,
          caption: generatedCampaign.caption,
          captionHash: generatedCampaign.captionHash || await hashCaption(generatedCampaign.caption),
          imageUrl: generatedCampaign.imageUrl,
          imageStatus: generatedCampaign.imageStatus,
          imagePrompt: generatedCampaign.imagePrompt || null,
          generationMetadata: generatedCampaign.generationMetadata || {}
        }
      });

      if (response.error) {
        const errorMessage = response.error.message || 'Failed to save campaign';
        // Check for duplicate caption
        if (errorMessage.includes('similar content')) {
          throw new Error('A campaign with similar content already exists. Please regenerate with different context.');
        }
        throw new Error(errorMessage);
      }

      const data = response.data?.campaign;
      if (!data) {
        throw new Error('No campaign data returned from server');
      }

      // Quiet confirmation - no celebration
      toast('Campaign completed. Proof generating...', { 
        icon: '🔒',
        duration: 3000 
      });
      
      console.log('✅ Campaign completed with fingerprint:', fingerprint);
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete campaign';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsCompleting(false);
    }
  }, [generatedCampaign]);

  const resetCampaign = useCallback(() => {
    setGeneratedCampaign(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    isCompleting,
    generatedCampaign,
    error,
    generateCampaign,
    regenerateCampaign,
    updateCaption,
    completeCampaign,
    resetCampaign,
    setGeneratedCampaign
  };
}
