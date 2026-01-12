import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Image style prompts for consistent generation
const IMAGE_STYLE_PROMPTS: Record<string, string> = {
  "cyberpunk": "cyberpunk aesthetic, neon lights, futuristic cityscape, dark background with cyan and purple glow, high tech blockchain visualization, digital art style",
  "minimalist": "minimalist design, clean lines, simple geometric shapes, white and cyan color scheme, modern and elegant, negative space, professional tech aesthetic",
  "gradient": "abstract gradient art, flowing colors transitioning from deep blue to cyan to green, smooth curves, modern digital art, tech-inspired organic shapes",
  "blueprint": "technical blueprint style, dark blue background, white and cyan wireframe drawings, circuit patterns, engineering aesthetic, grid overlay, technical diagrams",
  "space": "cosmic space theme, stars and nebulae, deep purple and blue galaxy, floating crypto symbols, ethereal glow, sci-fi atmosphere, blockchain in space visualization"
};

// Arc Network branding elements
const ARC_BRANDING = {
  colors: ["electric cyan (#00D9FF)", "deep space blue (#0A0E27)", "USDC green (#26A17B)"],
  elements: ["Arc logo stylized", "blockchain nodes", "transaction flow visualization", "USDC symbols"],
  atmosphere: "futuristic, cutting-edge technology, financial innovation"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caption, imageStyle, campaignType } = await req.json();

    if (!caption || !imageStyle) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: caption, imageStyle" }),
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

    const stylePrompt = IMAGE_STYLE_PROMPTS[imageStyle] || IMAGE_STYLE_PROMPTS["cyberpunk"];

    // Create a comprehensive image prompt
    const imagePrompt = `Create a 16:9 promotional image for Arc Network blockchain platform.

STYLE: ${stylePrompt}

THEME: Based on this campaign caption: "${caption.substring(0, 200)}"

BRANDING:
- Use colors: ${ARC_BRANDING.colors.join(", ")}
- Include elements like: ${ARC_BRANDING.elements.join(", ")}
- Overall atmosphere: ${ARC_BRANDING.atmosphere}

REQUIREMENTS:
- No text or words in the image
- High quality, professional marketing visual
- Suitable for social media (Twitter/X)
- Ultra high resolution
- Visually striking and shareable

Campaign type: ${campaignType || "general promotion"}`;

    console.log("Generating image with style:", imageStyle);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "user", content: imagePrompt }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract image from response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image generated:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Image generated successfully");

    return new Response(
      JSON.stringify({ 
        imageUrl,
        metadata: {
          style: imageStyle,
          generatedAt: new Date().toISOString()
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
