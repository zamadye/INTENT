-- Fix 1: Add defense-in-depth DENY policies for profiles_auth_secrets
-- The table already has service_role policy, but add explicit denies for other roles

-- Add explicit DENY policy for authenticated users
CREATE POLICY "auth_secrets_deny_authenticated" ON public.profiles_auth_secrets
FOR SELECT TO authenticated
USING (false);

-- Add explicit DENY policy for anon users  
CREATE POLICY "auth_secrets_deny_anon" ON public.profiles_auth_secrets
FOR SELECT TO anon
USING (false);

-- Revoke all privileges from non-service roles as additional protection
REVOKE ALL ON public.profiles_auth_secrets FROM anon;
REVOKE ALL ON public.profiles_auth_secrets FROM authenticated;
REVOKE ALL ON public.profiles_auth_secrets FROM public;

-- Fix 2: Restrict unused campaign_participations table to service-role only
-- This table is not used in the current application architecture

-- Drop the existing owner policy that has wallet attribution bypass
DROP POLICY IF EXISTS "participations_owner_all" ON public.campaign_participations;

-- Revoke all direct access from authenticated users
REVOKE ALL ON public.campaign_participations FROM authenticated;
REVOKE ALL ON public.campaign_participations FROM anon;
REVOKE ALL ON public.campaign_participations FROM public;

-- The service_role policy (participations_service_all) remains for future backend use