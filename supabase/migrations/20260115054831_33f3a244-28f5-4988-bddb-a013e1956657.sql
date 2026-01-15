-- Campaign Templates table (predefined by platform)
CREATE TABLE public.campaign_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'swap', 'lp', 'bridge'
  target_dapp TEXT NOT NULL,
  target_contract TEXT NOT NULL,
  required_event TEXT NOT NULL, -- e.g., 'Swap', 'AddLiquidity', 'TokensBridged'
  min_amount_usd NUMERIC DEFAULT 10,
  redirect_url TEXT NOT NULL,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign Participations table (user joins a template)
CREATE TABLE public.campaign_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.campaign_templates(id),
  
  -- Timing
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Verification data
  verification_status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed, expired
  verified_tx_hash TEXT,
  verified_amount NUMERIC,
  verification_error TEXT,
  
  -- After verification, link to campaign
  campaign_id UUID REFERENCES public.campaigns(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One participation per user per template at a time
  CONSTRAINT unique_active_participation UNIQUE (wallet_address, template_id, verification_status)
);

-- Enable RLS
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participations ENABLE ROW LEVEL SECURITY;

-- Templates: Public read, no user write (admin only via service role)
CREATE POLICY "templates_public_read" ON public.campaign_templates
  FOR SELECT USING (true);

CREATE POLICY "templates_service_all" ON public.campaign_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Participations: Owner only
CREATE POLICY "participations_owner_all" ON public.campaign_participations
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "participations_service_all" ON public.campaign_participations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_participations_updated_at
  BEFORE UPDATE ON public.campaign_participations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial templates for MVP (3 templates)
INSERT INTO public.campaign_templates (slug, name, description, category, target_dapp, target_contract, required_event, min_amount_usd, redirect_url) VALUES
  ('arcflow-swap', 'ArcFlow Swap', 'Complete a token swap on ArcFlow DEX with minimum $10 value', 'swap', 'ArcFlow', '0x0000000000000000000000000000000000000001', 'Swap', 10, 'https://arcflow.testnet.arc.network'),
  ('arcflow-lp', 'ArcFlow Liquidity', 'Add liquidity to any pool on ArcFlow with minimum $10 value', 'lp', 'ArcFlow', '0x0000000000000000000000000000000000000002', 'AddLiquidity', 10, 'https://arcflow.testnet.arc.network/pools'),
  ('across-bridge', 'Across Bridge', 'Bridge assets to Arc Network using Across Protocol with minimum $10 value', 'bridge', 'Across', '0x0000000000000000000000000000000000000003', 'TokensBridged', 10, 'https://across.to');

-- Grant permissions
GRANT SELECT ON public.campaign_templates TO anon, authenticated;
GRANT ALL ON public.campaign_participations TO authenticated;
REVOKE ALL ON public.campaign_participations FROM anon;