import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Arc Network context for AI generation
const ARC_CONTEXT = {
  network: {
    name: "Arc Network",
    type: "Layer 1 blockchain",
    consensus: "Malachite consensus mechanism",
    testnet: "Arc Testnet (Chain ID: 5042002)",
    rpc: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app"
  },
  features: {
    "usdc-gas": {
      name: "USDC Gas Fees",
      description: "Arc uses USDC as native gas token, providing predictable and stable transaction costs unlike volatile native tokens",
      benefits: ["Predictable costs", "No price volatility", "Better UX for users"]
    },
    "sub-second": {
      name: "Sub-second Finality", 
      description: "Transactions confirm in under 1 second, enabling real-time dApp experiences",
      benefits: ["Lightning fast confirmations", "Better UX", "Real-time applications"]
    },
    "arcflow": {
      name: "ArcFlow Finance",
      description: "Native DeFi ecosystem on Arc Network with lending, borrowing, and yield farming",
      benefits: ["Native DeFi", "Integrated ecosystem", "High yields"]
    },
    "malachite": {
      name: "Malachite Consensus",
      description: "Innovative consensus mechanism providing high throughput and security",
      benefits: ["High TPS", "Strong security", "Energy efficient"]
    },
    "testnet": {
      name: "Testnet Participation",
      description: "Early adopters can participate in Arc Testnet to explore features and potentially qualify for rewards",
      benefits: ["Early access", "Potential rewards", "Community building"]
    }
  },
  dApps: ["ArcFlow Finance", "ArcSwap", "ArcBridge", "ArcNFT Marketplace"],
  hashtags: ["#ArcNetwork", "#Web3", "#DeFi", "#Blockchain", "#Crypto", "#Testnet"]
};

const CAMPAIGN_TYPE_PROMPTS: Record<string, string> = {
  "product-launch": "Create an exciting product launch announcement that generates hype and FOMO",
  "community-event": "Write about a community event or milestone that brings people together",
  "educational": "Create an educational post that teaches something valuable about the technology",
  "meme-campaign": "Write a fun, memeable post with humor that the crypto community will appreciate",
  "defi-promotion": "Create a post promoting DeFi opportunities and financial benefits"
};

const TONE_MODIFIERS: Record<string, string> = {
  "professional": "Use professional, corporate language suitable for investors and institutions",
  "hype": "Use energetic, exciting language with emojis to build maximum hype",
  "educational": "Use clear, explanatory language that teaches and informs",
  "degen": "Use crypto-native slang, abbreviations, and degen culture references",
  "technical": "Include technical details and specifications for developer audience"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignType, tones, arcContext, customInput, walletAddress } = await req.json();

    if (!campaignType || !tones?.length || !arcContext?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: campaignType, tones, arcContext" }),
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

    // Build context from selected Arc features
    const selectedFeatures = arcContext.map((id: string) => {
      const feature = ARC_CONTEXT.features[id as keyof typeof ARC_CONTEXT.features];
      return feature ? `${feature.name}: ${feature.description}` : null;
    }).filter(Boolean).join("\n");

    // Build tone instructions
    const toneInstructions = tones.map((t: string) => TONE_MODIFIERS[t] || "").filter(Boolean).join(". ");

    const systemPrompt = `You are an expert Web3 marketing copywriter creating campaign content for Arc Network.

ABOUT ARC NETWORK:
${ARC_CONTEXT.network.name} is a ${ARC_CONTEXT.network.type} using ${ARC_CONTEXT.network.consensus}.
Currently in testnet phase: ${ARC_CONTEXT.network.testnet}

KEY FEATURES TO HIGHLIGHT:
${selectedFeatures}

ECOSYSTEM dApps: ${ARC_CONTEXT.dApps.join(", ")}

RULES:
1. Keep the caption under 280 characters for X/Twitter compatibility
2. Be creative and unique - avoid generic crypto phrases
3. Include 2-3 relevant hashtags from: ${ARC_CONTEXT.hashtags.join(", ")}
4. Do NOT include fake statistics or unverifiable claims
5. Do NOT promise guaranteed returns or financial advice
6. Make each caption unique - vary structure, hooks, and angles
7. Include appropriate emojis for visual appeal
8. Focus on genuine value propositions

TONE: ${toneInstructions}

CAMPAIGN TYPE: ${CAMPAIGN_TYPE_PROMPTS[campaignType] || "Create engaging content"}`;

    const userPrompt = customInput 
      ? `Create a unique campaign caption incorporating this angle: "${customInput}"`
      : "Create a unique, engaging campaign caption that stands out";

    console.log("Generating caption for campaign type:", campaignType);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.9, // Higher temperature for more variety
        max_tokens: 300
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
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim();

    if (!caption) {
      console.error("No caption generated:", data);
      return new Response(
        JSON.stringify({ error: "Failed to generate caption" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Caption generated successfully:", caption.substring(0, 50) + "...");

    return new Response(
      JSON.stringify({ 
        caption,
        metadata: {
          campaignType,
          tones,
          arcContext,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Caption generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
