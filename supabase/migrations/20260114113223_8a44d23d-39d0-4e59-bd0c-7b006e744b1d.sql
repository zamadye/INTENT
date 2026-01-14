-- Drop the SECURITY DEFINER functions that are no longer needed
-- Edge Functions use service_role client which already bypasses RLS
DROP FUNCTION IF EXISTS public.validate_campaign_ownership(uuid, text);
DROP FUNCTION IF EXISTS public.validate_nft_ownership(uuid, text);

-- Add auth_salt column to profiles for secure password generation
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS auth_salt text;