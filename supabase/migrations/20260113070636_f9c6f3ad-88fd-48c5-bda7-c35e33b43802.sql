
-- =============================================================
-- ARC INTENT PLATFORM - SECURITY HARDENING MIGRATION
-- =============================================================
-- Security Model: Wallet-based identity with backend verification
-- All write operations routed through authenticated edge functions
-- =============================================================

-- =============================================================
-- 1. DROP ALL EXISTING PERMISSIVE POLICIES
-- =============================================================

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Campaigns
DROP POLICY IF EXISTS "Anyone can create campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns are viewable by everyone" ON public.campaigns;
DROP POLICY IF EXISTS "Owners can update their campaigns" ON public.campaigns;

-- NFTs
DROP POLICY IF EXISTS "Anyone can create NFT records" ON public.nfts;
DROP POLICY IF EXISTS "NFTs are viewable by everyone" ON public.nfts;
DROP POLICY IF EXISTS "Owners can update their NFT records" ON public.nfts;

-- Marketplace Stats
DROP POLICY IF EXISTS "Anyone can insert marketplace stats" ON public.marketplace_stats;
DROP POLICY IF EXISTS "Anyone can update marketplace stats" ON public.marketplace_stats;
DROP POLICY IF EXISTS "Marketplace stats are viewable by everyone" ON public.marketplace_stats;

-- Marketplace Transactions
DROP POLICY IF EXISTS "Anyone can create transactions" ON public.marketplace_transactions;
DROP POLICY IF EXISTS "Transactions are viewable by everyone" ON public.marketplace_transactions;

-- NFT Likes
DROP POLICY IF EXISTS "Anyone can like NFTs" ON public.nft_likes;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.nft_likes;
DROP POLICY IF EXISTS "Users can remove their likes" ON public.nft_likes;

-- =============================================================
-- 2. PROFILES TABLE - STRICT PRIVACY
-- Only backend service can read/write. No cross-user visibility.
-- =============================================================

-- SELECT: Only service role (edge functions) can read profiles
-- This prevents wallet address scraping
CREATE POLICY "profiles_service_select"
ON public.profiles
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only service role can create profiles
CREATE POLICY "profiles_service_insert"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only service role can update profiles
CREATE POLICY "profiles_service_update"
ON public.profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================
-- 3. CAMPAIGNS TABLE - PUBLIC READ, SERVICE WRITE
-- Campaigns must be visible for marketplace browsing
-- All writes through backend (ownership verified in edge functions)
-- =============================================================

-- SELECT: Public read for marketplace browsing (intentional)
CREATE POLICY "campaigns_public_select"
ON public.campaigns
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role full access
CREATE POLICY "campaigns_service_select"
ON public.campaigns
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only through backend service (wallet verified in edge function)
CREATE POLICY "campaigns_service_insert"
ON public.campaigns
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only through backend service (ownership verified in edge function)
CREATE POLICY "campaigns_service_update"
ON public.campaigns
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================
-- 4. NFTS TABLE - PUBLIC READ, SERVICE WRITE
-- NFTs visible for marketplace, writes through backend
-- =============================================================

-- SELECT: Public read for marketplace
CREATE POLICY "nfts_public_select"
ON public.nfts
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role full access
CREATE POLICY "nfts_service_select"
ON public.nfts
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only through backend service
CREATE POLICY "nfts_service_insert"
ON public.nfts
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only through backend service (ownership verified)
CREATE POLICY "nfts_service_update"
ON public.nfts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================
-- 5. MARKETPLACE_STATS - PUBLIC READ, SERVICE WRITE
-- Aggregate stats are public (no PII)
-- =============================================================

-- SELECT: Public read (aggregate data only, no PII)
CREATE POLICY "marketplace_stats_public_select"
ON public.marketplace_stats
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role full access
CREATE POLICY "marketplace_stats_service_select"
ON public.marketplace_stats
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only service role
CREATE POLICY "marketplace_stats_service_insert"
ON public.marketplace_stats
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only service role
CREATE POLICY "marketplace_stats_service_update"
ON public.marketplace_stats
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================
-- 6. MARKETPLACE_TRANSACTIONS - SANITIZED PUBLIC VIEW
-- Wallet addresses hidden from public, only participants see full data
-- =============================================================

-- SELECT: Only service role sees full transaction data
CREATE POLICY "marketplace_transactions_service_select"
ON public.marketplace_transactions
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only service role
CREATE POLICY "marketplace_transactions_service_insert"
ON public.marketplace_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================================
-- 7. NFT_LIKES - PUBLIC READ COUNTS, SERVICE WRITE
-- Like counts visible, individual likes managed by backend
-- =============================================================

-- SELECT: Public read (for displaying like counts)
CREATE POLICY "nft_likes_public_select"
ON public.nft_likes
FOR SELECT
TO anon, authenticated
USING (true);

-- Service role full access
CREATE POLICY "nft_likes_service_select"
ON public.nft_likes
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only through backend (prevents spam/manipulation)
CREATE POLICY "nft_likes_service_insert"
ON public.nft_likes
FOR INSERT
TO service_role
WITH CHECK (true);

-- DELETE: Only through backend (ownership verified)
CREATE POLICY "nft_likes_service_delete"
ON public.nft_likes
FOR DELETE
TO service_role
USING (true);

-- =============================================================
-- 8. CREATE SANITIZED VIEW FOR PUBLIC TRANSACTION ANALYTICS
-- Exposes transaction data without wallet addresses
-- =============================================================

CREATE OR REPLACE VIEW public.marketplace_transactions_public AS
SELECT 
  id,
  nft_id,
  price,
  -- Sanitize wallet addresses: show only first 6 and last 4 chars
  CONCAT(LEFT(seller_address, 6), '...', RIGHT(seller_address, 4)) AS seller_masked,
  CONCAT(LEFT(buyer_address, 6), '...', RIGHT(buyer_address, 4)) AS buyer_masked,
  tx_hash,
  created_at
FROM public.marketplace_transactions;

-- Grant read access to the sanitized view
GRANT SELECT ON public.marketplace_transactions_public TO anon, authenticated;

-- =============================================================
-- 9. CREATE HELPER FUNCTION FOR WALLET OWNERSHIP VALIDATION
-- Used by edge functions for ownership verification
-- =============================================================

CREATE OR REPLACE FUNCTION public.validate_campaign_ownership(
  _campaign_id uuid,
  _wallet_address text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE id = _campaign_id
      AND wallet_address = _wallet_address
  )
$$;

CREATE OR REPLACE FUNCTION public.validate_nft_ownership(
  _nft_id uuid,
  _wallet_address text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.nfts
    WHERE id = _nft_id
      AND wallet_address = _wallet_address
  )
$$;

-- =============================================================
-- SECURITY SUMMARY
-- =============================================================
-- 
-- profiles:           SERVICE ONLY (no public access - prevents wallet scraping)
-- campaigns:          PUBLIC READ, SERVICE WRITE (marketplace browsing)
-- nfts:               PUBLIC READ, SERVICE WRITE (marketplace browsing)
-- marketplace_stats:  PUBLIC READ, SERVICE WRITE (aggregate stats only)
-- marketplace_transactions: SERVICE ONLY (use sanitized view for public)
-- nft_likes:          PUBLIC READ, SERVICE WRITE (like counts visible)
--
-- All write operations require service_role (edge functions)
-- Edge functions verify wallet ownership before mutations
-- =============================================================
