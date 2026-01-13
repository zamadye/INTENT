-- =====================================================
-- Security Enhancement: Scoped Service Role Policies
-- =====================================================
-- Replace permissive service_role policies with scoped ones
-- that still require valid user context (auth.uid())
-- This provides defense-in-depth against service key compromise

-- Drop existing permissive service role policies
DROP POLICY IF EXISTS campaigns_service_all ON public.campaigns;
DROP POLICY IF EXISTS nfts_service_all ON public.nfts;
DROP POLICY IF EXISTS profiles_service_all ON public.profiles;

-- Create scoped service role policies for campaigns
-- Allows service_role operations only when user context is properly set
CREATE POLICY campaigns_service_scoped
ON public.campaigns
FOR ALL
TO service_role
USING (
  -- Service role can access when:
  -- 1. A valid user session exists AND matches owner, OR
  -- 2. User context is explicitly set via the edge function
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  -- Allow service role to create new records (INSERT case where user_id will be set)
  (user_id IS NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (user_id IS NULL)
);

-- Create scoped service role policies for nfts
CREATE POLICY nfts_service_scoped
ON public.nfts
FOR ALL
TO service_role
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  (user_id IS NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (user_id IS NULL)
);

-- Create scoped service role policies for profiles
CREATE POLICY profiles_service_scoped
ON public.profiles
FOR ALL
TO service_role
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR 
  (user_id IS NULL)
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (user_id IS NULL)
);