-- PHASE 1: Clean up marketplace schema (NFTs are now for proof orchestration, not sale)

-- 1. Drop marketplace-related views first
DROP VIEW IF EXISTS marketplace_transactions_public CASCADE;

-- 2. Drop marketplace tables
DROP TABLE IF EXISTS marketplace_transactions CASCADE;
DROP TABLE IF EXISTS marketplace_stats CASCADE;
DROP TABLE IF EXISTS nft_likes CASCADE;

-- 3. Remove marketplace-related columns from nfts table
ALTER TABLE public.nfts 
  DROP COLUMN IF EXISTS is_listed,
  DROP COLUMN IF EXISTS listing_price,
  DROP COLUMN IF EXISTS listed_at,
  DROP COLUMN IF EXISTS seller_address,
  DROP COLUMN IF EXISTS buyer_address,
  DROP COLUMN IF EXISTS sold_at,
  DROP COLUMN IF EXISTS views_count,
  DROP COLUMN IF EXISTS likes_count;

-- 4. Rename 'mint_cost' to 'proof_cost' for clarity
ALTER TABLE public.nfts RENAME COLUMN mint_cost TO proof_cost;

-- 5. Add columns for proof orchestration
ALTER TABLE public.nfts 
  ADD COLUMN IF NOT EXISTS intent_fingerprint text,
  ADD COLUMN IF NOT EXISTS intent_category integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- 6. Drop old RLS policies on nfts
DROP POLICY IF EXISTS "nfts_public_select" ON nfts;
DROP POLICY IF EXISTS "nfts_service_select" ON nfts;
DROP POLICY IF EXISTS "nfts_service_insert" ON nfts;
DROP POLICY IF EXISTS "nfts_service_update" ON nfts;

-- 7. Create new focused RLS for proof orchestration
-- Public can READ proofs (transparency)
CREATE POLICY "proofs_public_select"
ON public.nfts
FOR SELECT
TO anon, authenticated
USING (true);

-- Only service-role can create/update proofs
CREATE POLICY "proofs_service_insert"
ON public.nfts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "proofs_service_update"
ON public.nfts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 8. profiles table - already service_role only, but verify by recreating policies
DROP POLICY IF EXISTS "profiles_service_select" ON profiles;
DROP POLICY IF EXISTS "profiles_service_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_service_update" ON profiles;

-- Profiles are STRICTLY service-role only (no public access to wallet addresses)
CREATE POLICY "profiles_service_only_select"
ON public.profiles
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "profiles_service_only_insert"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "profiles_service_only_update"
ON public.profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);