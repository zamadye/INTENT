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

    const POLLINATIONS_API_KEY = Deno.env.get("POLLINATIONS_API_KEY");
    
    // Pollinations AI can work without API key for basic usage, but we'll use it if available
    console.log("Pollinations API key configured:", !!POLLINATIONS_API_KEY);

    const stylePrompt = IMAGE_STYLE_PROMPTS[imageStyle] || IMAGE_STYLE_PROMPTS["cyberpunk"];

    // Create a comprehensive image prompt
    const imagePrompt = `${stylePrompt}, promotional image for Arc Network blockchain platform, based on: ${caption.substring(0, 150)}, colors: ${ARC_BRANDING.colors.join(", ")}, elements: ${ARC_BRANDING.elements.join(", ")}, ${ARC_BRANDING.atmosphere}, no text or words, high quality, professional marketing visual, ultra high resolution, 16:9 aspect ratio`;

    console.log("Generating image with Pollinations AI, style:", imageStyle);

    // Pollinations AI Image Generation endpoint
    // Using text-to-image endpoint with proper encoding
    const encodedPrompt = encodeURIComponent(imagePrompt);
    
    // Build URL with parameters
    let pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true&seed=${Date.now()}`;
    
    // Add API key if available
    if (POLLINATIONS_API_KEY) {
      pollinationsUrl += `&token=${POLLINATIONS_API_KEY}`;
    }

    console.log("Pollinations URL generated");

    // Verify the image can be accessed by making a HEAD request
    const checkResponse = await fetch(pollinationsUrl, { method: 'HEAD' });
    
    if (!checkResponse.ok) {
      console.error("Pollinations API error:", checkResponse.status);
      return new Response(
        JSON.stringify({ error: "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Image generated successfully");

    return new Response(
      JSON.stringify({ 
        imageUrl: pollinationsUrl,
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
