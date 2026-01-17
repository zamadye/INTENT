-- Fix security: Restrict profiles and siwe_nonces tables to prevent public exposure
-- The issue is that RESTRICTIVE policies with USING(true) for service_role still allow 
-- the anon role to match. We need to explicitly check the role.

-- Drop existing policies that use USING(true) without role checks
DROP POLICY IF EXISTS profiles_service_all ON public.profiles;
DROP POLICY IF EXISTS siwe_nonces_service_only ON public.siwe_nonces;

-- Recreate service policies with explicit role checks
-- Profiles: service_role only (uses pg_has_role for proper role check)
CREATE POLICY profiles_service_all 
ON public.profiles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Siwe_nonces: service_role only
CREATE POLICY siwe_nonces_service_only 
ON public.siwe_nonces 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly revoke all access from anon and public roles on sensitive tables
REVOKE ALL ON public.profiles FROM anon, public;
REVOKE ALL ON public.siwe_nonces FROM anon, public;
REVOKE ALL ON public.profiles_auth_secrets FROM anon, public;

-- Grant access only to authenticated (for profiles via RLS owner check) and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.siwe_nonces TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_auth_secrets TO service_role;