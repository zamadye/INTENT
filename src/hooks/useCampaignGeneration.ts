import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

interface CampaignData {
  campaignType: string;
  tones: string[];
  arcContext: string[];
  customInput: string;
  imageStyle: string;
}

export interface GeneratedCampaign {
  id: string;
  caption: string;
  imageUrl: string | null;
  imageStatus: 'pending' | 'generating' | 'completed' | 'failed';
  captionHash?: string;
}

// Simple hash function for caption deduplication
async function hashCaption(caption: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(caption.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useCampaignGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateCampaign = useCallback(async (
    campaignData: CampaignData,
    walletAddress: string | null
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Generate caption
      console.log('Generating caption...');
      const captionResponse = await supabase.functions.invoke('generate-caption', {
        body: {
          campaignType: campaignData.campaignType,
          tones: campaignData.tones,
          arcContext: campaignData.arcContext,
          customInput: campaignData.customInput,
          walletAddress
        }
      });

      if (captionResponse.error) {
        throw new Error(captionResponse.error.message || 'Failed to generate caption');
      }

      const { caption } = captionResponse.data;
      if (!caption) {
        throw new Error('No caption received from AI');
      }

      const captionHash = await hashCaption(caption);
      const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Set initial state with caption
      setGeneratedCampaign({
        id: campaignId,
        caption,
        imageUrl: null,
        imageStatus: 'generating',
        captionHash
      });

      toast.success('Caption generated!', { icon: '✍️' });

      // Step 2: Generate image
      console.log('Generating image...');
      const imageResponse = await supabase.functions.invoke('generate-image', {
        body: {
          caption,
          imageStyle: campaignData.imageStyle,
          campaignType: campaignData.campaignType
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
    if (generatedCampaign) {
      const captionHash = await hashCaption(newCaption);
      setGeneratedCampaign({
        ...generatedCampaign,
        caption: newCaption,
        captionHash
      });
    }
  }, [generatedCampaign]);

  const saveCampaignToDatabase = useCallback(async (
    campaignData: CampaignData,
    walletAddress: string
  ) => {
    if (!generatedCampaign) {
      throw new Error('No campaign to save');
    }

    try {
      const { data, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          wallet_address: walletAddress,
          campaign_type: campaignData.campaignType,
          tones: campaignData.tones,
          arc_context: campaignData.arcContext,
          custom_input: campaignData.customInput,
          image_style: campaignData.imageStyle,
          caption: generatedCampaign.caption,
          caption_hash: generatedCampaign.captionHash || await hashCaption(generatedCampaign.caption),
          image_url: generatedCampaign.imageUrl,
          image_status: generatedCampaign.imageStatus,
          status: 'draft'
        })
        .select()
        .single();

      if (insertError) {
        // Check for duplicate caption
        if (insertError.code === '23505') {
          throw new Error('A campaign with similar content already exists. Please regenerate with different context.');
        }
        throw insertError;
      }

      toast.success('Campaign saved!', { icon: '💾' });
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save campaign';
      toast.error(errorMessage);
      throw err;
    }
  }, [generatedCampaign]);

  const resetCampaign = useCallback(() => {
    setGeneratedCampaign(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    generatedCampaign,
    error,
    generateCampaign,
    regenerateCampaign,
    updateCaption,
    saveCampaignToDatabase,
    resetCampaign,
    setGeneratedCampaign
  };
}
