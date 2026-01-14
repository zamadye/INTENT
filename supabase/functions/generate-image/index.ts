import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // JWT Authentication - Protect AI endpoint
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user for image generation:", userId);
    // ============================================

    const { caption, imageStyle, campaignType, visualPrompt, campaignId } = await req.json();

    // Accept either visualPrompt (from Layer 2) or caption (fallback)
    if (!visualPrompt && !caption) {
      return new Response(
        JSON.stringify({ error: "Missing required field: visualPrompt or caption" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided visual prompt or create a basic one
    let imagePrompt: string;
    
    if (visualPrompt) {
      // Layer 3: Use the AI-generated visual prompt from Layer 2
      imagePrompt = visualPrompt;
      console.log("Layer 3: Using AI-generated visual prompt");
    } else {
      // Fallback: Create a basic prompt from caption
      const styleDescriptions: Record<string, string> = {
        "cyberpunk": "cyberpunk aesthetic, neon cyan and magenta lights, futuristic dark cityscape, holographic blockchain visualization",
        "minimalist": "minimalist design, clean geometric shapes, white background with cyan accents, elegant negative space",
        "gradient": "abstract gradient art, flowing colors from deep blue to cyan to teal, organic shapes, ethereal glow",
        "blueprint": "technical blueprint style, dark blue background, white wireframe drawings, engineering grid overlay",
        "space": "cosmic space theme, deep purple nebulae, stars, blockchain constellation patterns, ethereal sci-fi atmosphere"
      };
      
      const style = styleDescriptions[imageStyle] || styleDescriptions["cyberpunk"];
      imagePrompt = `${style}, promotional marketing image for Arc Network blockchain, abstract visualization of: ${caption.substring(0, 100)}, no text or words, ultra high resolution, 16:9 aspect ratio, professional marketing quality, electric cyan (#00D9FF) and deep space blue (#0A0E27) color palette`;
      console.log("Layer 3: Using fallback prompt generation");
    }

    console.log("Generating image with Lovable AI (Nano Banana)...");
    console.log("Prompt preview:", imagePrompt.substring(0, 150) + "...");

    // Use Lovable AI image generation (Nano Banana model)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Generate a stunning 16:9 promotional image for social media marketing: ${imagePrompt}`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI image generation error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Image generation failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI response received");
    
    // Extract the generated image from the response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Image generated successfully");

    // ============================================
    // Upload to Supabase Storage for public URL
    // ============================================
    let publicImageUrl = imageData; // Fallback to base64 if upload fails
    
    try {
      // Create service client for storage upload
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Extract base64 data from data URL
      const base64Match = imageData.match(/^data:image\/(png|jpeg|webp|gif);base64,(.+)$/);
      
      if (base64Match) {
        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        const imageBytes = base64Decode(base64Data);
        
        // Generate unique filename
        const filename = `${campaignId || userId}-${Date.now()}.${mimeType === 'jpeg' ? 'jpg' : mimeType}`;
        
        console.log("Uploading image to storage:", filename);
        
        const { data: uploadData, error: uploadError } = await serviceClient.storage
          .from('campaign-images')
          .upload(filename, imageBytes, {
            contentType: `image/${mimeType}`,
            upsert: true
          });
        
        if (uploadError) {
          console.error("Storage upload error:", uploadError.message);
          // Continue with base64 fallback
        } else {
          // Get public URL
          const { data: publicUrlData } = serviceClient.storage
            .from('campaign-images')
            .getPublicUrl(filename);
          
          publicImageUrl = publicUrlData.publicUrl;
          console.log("Image uploaded successfully:", publicImageUrl);
        }
      } else {
        console.log("Image is not base64, using as-is");
      }
    } catch (uploadError) {
      console.error("Image upload failed, using base64 fallback:", uploadError);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: publicImageUrl,
        metadata: {
          style: imageStyle,
          generatedAt: new Date().toISOString(),
          method: visualPrompt ? "3-layer-ai" : "fallback",
          isPublicUrl: !publicImageUrl.startsWith('data:')
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Image generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
