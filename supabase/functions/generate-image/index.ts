import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const { caption, imageStyle, campaignType, visualPrompt } = await req.json();

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

    console.log("Image generated successfully (base64 data URL)");

    return new Response(
      JSON.stringify({ 
        imageUrl: imageData,
        metadata: {
          style: imageStyle,
          generatedAt: new Date().toISOString(),
          method: visualPrompt ? "3-layer-ai" : "fallback"
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
