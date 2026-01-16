import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Share Page Edge Function
 * 
 * Serves an HTML page with OpenGraph and Twitter Card meta tags
 * for rich link previews when sharing campaign proofs on X/Twitter.
 * 
 * Route: /p/:campaignId
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract campaignId from path: /share-page/:campaignId or just /:campaignId
    let campaignId = pathParts[pathParts.length - 1];
    
    // Also check query params as fallback
    if (!campaignId || campaignId === 'share-page') {
      campaignId = url.searchParams.get('id') || '';
    }
    
    console.log("Share page requested for campaign:", campaignId);

    if (!campaignId) {
      return new Response(
        generateErrorHtml("Campaign not found", "No campaign ID provided"),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } 
        }
      );
    }

    // Create service client to fetch campaign data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch campaign data
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, caption, image_url, status, campaign_type, wallet_address, created_at')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      console.error("Campaign fetch error:", error?.message);
      return new Response(
        generateErrorHtml("Campaign not found", "This campaign doesn't exist or has been removed"),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } 
        }
      );
    }

    // Fetch proof/NFT data if exists
    const { data: proof } = await supabase
      .from('nfts')
      .select('id, status, tx_hash, intent_fingerprint, minted_at')
      .eq('campaign_id', campaignId)
      .eq('status', 'minted')
      .single();

    // Generate the HTML with meta tags
    const html = generateShareHtml(campaign, proof);

    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error("Share page error:", error);
    return new Response(
      generateErrorHtml("Error", "Something went wrong"),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } 
      }
    );
  }
});

interface Campaign {
  id: string;
  caption: string;
  image_url: string | null;
  status: string;
  campaign_type: string;
  wallet_address: string;
  created_at: string;
}

interface Proof {
  id: string;
  status: string;
  tx_hash: string | null;
  intent_fingerprint: string | null;
  minted_at: string | null;
}

function generateShareHtml(campaign: Campaign, proof: Proof | null): string {
  const siteUrl = 'https://app-intent.lovable.app';
  // Redirect to /create page instead of /proofs
  const redirectUrl = `${siteUrl}/create`;
  
  // Truncate caption for meta description (max 200 chars)
  const description = campaign.caption.length > 200 
    ? campaign.caption.substring(0, 197) + '...' 
    : campaign.caption;
  
  // Determine image URL - must be absolute and publicly accessible
  let imageUrl = campaign.image_url || '';
  
  // If image is base64, use a fallback placeholder
  if (imageUrl.startsWith('data:')) {
    imageUrl = `${siteUrl}/placeholder.svg`;
  }
  
  // Make sure URL is absolute
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${siteUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  const title = proof 
    ? `Intent Proof on Arc Network` 
    : `Campaign on Arc Network`;
  
  const proofBadge = proof 
    ? `<span style="background: #00D9FF; color: #0A0E27; padding: 4px 12px; border-radius: 4px; font-size: 12px;">✓ Verified Proof</span>` 
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${title}">
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${redirectUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="INTENT">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${redirectUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  
  <!-- Redirect to create page -->
  <meta http-equiv="refresh" content="0; url=${redirectUrl}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0E27;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 600px;
    }
    h1 {
      color: #00D9FF;
      margin-bottom: 16px;
    }
    p {
      color: #8892b0;
      line-height: 1.6;
    }
    a {
      color: #00D9FF;
      text-decoration: none;
    }
    .loading {
      margin-top: 20px;
      color: #8892b0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>INTENT</h1>
    ${proofBadge}
    <p>Redirecting to INTENT...</p>
    <p class="loading">If not redirected, <a href="${redirectUrl}">click here</a></p>
  </div>
  <script>
    window.location.href = "${redirectUrl}";
  </script>
</body>
</html>`;
}

function generateErrorHtml(title: string, message: string): string {
  const siteUrl = 'https://app-intent.lovable.app';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - INTENT</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0E27;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    h1 {
      color: #ff6b6b;
    }
    p {
      color: #8892b0;
    }
    a {
      color: #00D9FF;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="${siteUrl}">Go to INTENT</a></p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}