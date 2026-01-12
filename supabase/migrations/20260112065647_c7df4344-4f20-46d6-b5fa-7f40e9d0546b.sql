-- Add marketplace fields to nfts table
ALTER TABLE public.nfts 
ADD COLUMN IF NOT EXISTS listing_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_listed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS listed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seller_address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS buyer_address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sold_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Create marketplace_stats table for floor price and volume tracking
CREATE TABLE public.marketplace_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_price numeric DEFAULT 0,
  total_volume numeric DEFAULT 0,
  total_sales integer DEFAULT 0,
  total_listed integer DEFAULT 0,
  avg_price numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create marketplace_transactions table for tracking sales history
CREATE TABLE public.marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid REFERENCES public.nfts(id) ON DELETE CASCADE NOT NULL,
  seller_address text NOT NULL,
  buyer_address text NOT NULL,
  price numeric NOT NULL,
  tx_hash text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create nft_likes table for tracking user interactions
CREATE TABLE public.nft_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id uuid REFERENCES public.nfts(id) ON DELETE CASCADE NOT NULL,
  wallet_address text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(nft_id, wallet_address)
);

-- Enable RLS on new tables
ALTER TABLE public.marketplace_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketplace_stats (readable by all, updatable by system)
CREATE POLICY "Marketplace stats are viewable by everyone"
ON public.marketplace_stats FOR SELECT USING (true);

CREATE POLICY "Anyone can insert marketplace stats"
ON public.marketplace_stats FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update marketplace stats"
ON public.marketplace_stats FOR UPDATE USING (true);

-- RLS policies for marketplace_transactions
CREATE POLICY "Transactions are viewable by everyone"
ON public.marketplace_transactions FOR SELECT USING (true);

CREATE POLICY "Anyone can create transactions"
ON public.marketplace_transactions FOR INSERT WITH CHECK (true);

-- RLS policies for nft_likes
CREATE POLICY "Likes are viewable by everyone"
ON public.nft_likes FOR SELECT USING (true);

CREATE POLICY "Anyone can like NFTs"
ON public.nft_likes FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove their likes"
ON public.nft_likes FOR DELETE USING (true);

-- Insert initial marketplace stats row
INSERT INTO public.marketplace_stats (floor_price, total_volume, total_sales, total_listed, avg_price)
VALUES (0.01, 0, 0, 0, 0.01);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nfts_is_listed ON public.nfts(is_listed);
CREATE INDEX IF NOT EXISTS idx_nfts_listing_price ON public.nfts(listing_price);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_nft_id ON public.marketplace_transactions(nft_id);
CREATE INDEX IF NOT EXISTS idx_nft_likes_nft_id ON public.nft_likes(nft_id);