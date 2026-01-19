/**
 * Share Utility Functions
 * 
 * Implements 3-tier share strategy:
 * - TIER 1: Web Share API (mobile with native image sharing)
 * - TIER 2: Desktop fallback (auto-download + Twitter intent)
 * - TIER 3: Link-only share (Twitter Card preview)
 */

import { supabase } from '@/integrations/supabase/client';

// Device detection
export const isMobile = (): boolean => {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check Web Share API support (with files)
export const canShareFiles = async (): Promise<boolean> => {
  if (!navigator.canShare) return false;
  try {
    // Create a small test file to check file sharing capability
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
};

// Convert image URL to File object
export const urlToFile = async (url: string, filename: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';
  return new File([blob], filename, { type: mimeType, lastModified: Date.now() });
};

// Convert base64 to File object
export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime, lastModified: Date.now() });
};

// Web Share API implementation
export interface ShareResult {
  success: boolean;
  method: 'web_share_api' | 'cancelled' | 'fallback' | 'error';
  error?: string;
}

export const shareViaWebShareAPI = async (params: {
  text: string;
  imageUrl: string;
  campaignId: string;
}): Promise<ShareResult> => {
  const { text, imageUrl, campaignId } = params;
  
  try {
    let imageFile: File;
    
    // Handle base64 vs URL images
    if (imageUrl.startsWith('data:')) {
      imageFile = base64ToFile(imageUrl, `intent-${campaignId}.png`);
    } else {
      imageFile = await urlToFile(imageUrl, `intent-${campaignId}.png`);
    }
    
    const shareData: ShareData = {
      files: [imageFile],
      text: text,
      title: 'INTENT Campaign'
    };
    
    // Check if this specific share data can be shared
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return { success: true, method: 'web_share_api' };
    }
    
    // Fall back to text-only share if files not supported
    const textOnlyData: ShareData = {
      text: text,
      title: 'INTENT Campaign'
    };
    
    if (navigator.canShare && navigator.canShare(textOnlyData)) {
      await navigator.share(textOnlyData);
      return { success: true, method: 'web_share_api' };
    }
    
    return { success: false, method: 'fallback', error: 'Web Share API not supported for this content' };
  } catch (error) {
    const err = error as Error;
    
    // User cancelled the share
    if (err.name === 'AbortError') {
      return { success: false, method: 'cancelled' };
    }
    
    // NotAllowedError - user gesture required or permission denied
    if (err.name === 'NotAllowedError') {
      return { success: false, method: 'fallback', error: 'Permission denied for sharing' };
    }
    
    console.error('Web Share API error:', err);
    return { success: false, method: 'error', error: err.message };
  }
};

// Auto-download helper
export const autoDownloadImage = async (url: string, filename: string): Promise<void> => {
  let blob: Blob;
  
  if (url.startsWith('data:')) {
    // Convert base64 to blob
    const arr = url.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    blob = new Blob([u8arr], { type: mime });
  } else {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    blob = await response.blob();
  }
  
  const objectUrl = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // Cleanup after a delay
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, 1000);
};

// Track share events for analytics
export type ShareMethod = 'web_share_api' | 'desktop_fallback' | 'intent_only' | 'copy_link' | 'download';

export const trackShareEvent = async (
  method: ShareMethod, 
  campaignId: string,
  platform: 'mobile' | 'desktop'
): Promise<void> => {
  try {
    await supabase.from('share_events').insert({
      campaign_id: campaignId,
      share_method: method,
      platform: platform,
      user_agent: navigator.userAgent.substring(0, 500)
    });
  } catch (e) {
    // Silent fail for analytics - don't disrupt user experience
    console.log('Analytics tracking failed:', e);
  }
};

// Open Twitter intent with text
export const openTwitterIntent = (text: string): void => {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
};
