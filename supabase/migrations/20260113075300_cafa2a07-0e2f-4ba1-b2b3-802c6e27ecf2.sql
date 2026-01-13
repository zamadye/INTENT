-- TASK 1: Fix profiles table RLS security
-- The profiles table should NOT be publicly readable because it exposes wallet addresses
-- Since we don't use Supabase Auth (we use SIWE), we restrict all access to service_role only
-- The edge functions will handle ownership verification via SIWE signatures

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "profiles_service_only_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_only_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_only_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_user_select" ON public.profiles;

-- Create restrictive policies for profiles (service_role only)
-- All profile operations must go through edge functions that verify SIWE signatures
CREATE POLICY "profiles_service_only_access"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block all anon/authenticated access to profiles
-- No public policy = no public access when RLS is enabled

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Also ensure nfts table has proper restrictive policies
DROP POLICY IF EXISTS "proofs_public_select" ON public.nfts;
DROP POLICY IF EXISTS "proofs_service_insert" ON public.nfts;
DROP POLICY IF EXISTS "proofs_service_update" ON public.nfts;

-- nfts: Public can read proofs (they're meant to be a public ledger)
-- But only service_role can write (edge functions verify ownership)
CREATE POLICY "nfts_public_read"
ON public.nfts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "nfts_service_write"
ON public.nfts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- campaigns: Public can read, service_role writes
DROP POLICY IF EXISTS "campaigns_public_select" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_service_select" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_service_insert" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_service_update" ON public.campaigns;

CREATE POLICY "campaigns_public_read"
ON public.campaigns
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "campaigns_service_write"
ON public.campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);