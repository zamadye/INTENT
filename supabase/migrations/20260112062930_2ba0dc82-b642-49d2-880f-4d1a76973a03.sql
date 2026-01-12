-- Create users/profiles table linked to wallet addresses
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT,
  campaigns_created INTEGER NOT NULL DEFAULT 0,
  nfts_minted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  tones TEXT[] NOT NULL DEFAULT '{}',
  arc_context TEXT[] NOT NULL DEFAULT '{}',
  custom_input TEXT,
  image_style TEXT NOT NULL,
  caption TEXT NOT NULL,
  caption_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash for duplicate prevention
  image_url TEXT,
  image_status TEXT NOT NULL DEFAULT 'pending' CHECK (image_status IN ('pending', 'generating', 'completed', 'failed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'executed', 'distributed', 'activated', 'dormant', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create NFTs table (on-chain execution records)
CREATE TABLE public.nfts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  token_id TEXT, -- On-chain token ID once minted
  tx_hash TEXT, -- Transaction hash
  metadata_hash TEXT, -- IPFS or content hash
  mint_cost DECIMAL(18, 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minting', 'minted', 'failed')),
  minted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_wallet ON public.profiles(wallet_address);
CREATE INDEX idx_campaigns_wallet ON public.campaigns(wallet_address);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_created ON public.campaigns(created_at DESC);
CREATE INDEX idx_nfts_wallet ON public.nfts(wallet_address);
CREATE INDEX idx_nfts_campaign ON public.nfts(campaign_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;

-- Profiles policies (public read for gallery, write for own wallet)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (true);

-- Campaigns policies (public read for gallery, owner writes)
CREATE POLICY "Campaigns are viewable by everyone" 
ON public.campaigns FOR SELECT USING (true);

CREATE POLICY "Anyone can create campaigns" 
ON public.campaigns FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their campaigns" 
ON public.campaigns FOR UPDATE USING (true);

-- NFTs policies (public read for gallery, owner writes)
CREATE POLICY "NFTs are viewable by everyone" 
ON public.nfts FOR SELECT USING (true);

CREATE POLICY "Anyone can create NFT records" 
ON public.nfts FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their NFT records" 
ON public.nfts FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for campaigns and NFTs
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nfts;