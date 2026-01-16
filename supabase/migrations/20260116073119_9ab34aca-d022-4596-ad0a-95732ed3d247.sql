-- ============================================================
-- FIX 1: Move auth_salt to a separate protected table
-- This prevents the auth_salt from being exposed to authenticated users
-- ============================================================

-- Create a separate table for auth secrets (service_role only)
CREATE TABLE IF NOT EXISTS public.profiles_auth_secrets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_salt text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the auth secrets table
ALTER TABLE public.profiles_auth_secrets ENABLE ROW LEVEL SECURITY;

-- ONLY service_role can access this table - no authenticated user access
CREATE POLICY "secrets_service_only" ON public.profiles_auth_secrets
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Migrate existing auth_salt data to the new table
INSERT INTO public.profiles_auth_secrets (user_id, auth_salt)
SELECT user_id, auth_salt 
FROM public.profiles 
WHERE auth_salt IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Drop the auth_salt column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_salt;

-- ============================================================
-- FIX 2: Strengthen campaign_participations RLS to validate campaign ownership
-- Prevents users from linking participations to campaigns they don't own
-- ============================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "participations_owner_all" ON public.campaign_participations;

-- Create a more restrictive policy that validates campaign ownership
-- Users can only link participations to campaigns they own
CREATE POLICY "participations_owner_all" ON public.campaign_participations
FOR ALL TO authenticated 
USING (
  auth.uid() = user_id
  AND (
    campaign_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_participations.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND (
    campaign_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_participations.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  )
);

-- ============================================================
-- FIX 3: Create rate_limits table for tracking API usage
-- Enables application-level rate limiting across edge functions
-- ============================================================

-- Create rate_limits table for tracking requests
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint_window 
ON public.rate_limits (user_id, endpoint, window_start);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage rate limits
CREATE POLICY "rate_limits_service_only" ON public.rate_limits
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
REVOKE ALL ON public.rate_limits FROM anon, public;
REVOKE ALL ON public.profiles_auth_secrets FROM anon, public;