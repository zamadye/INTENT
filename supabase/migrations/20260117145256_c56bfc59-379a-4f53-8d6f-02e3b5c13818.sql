-- Fix profiles_public_select: Add explicit SELECT policy for profile owners
-- The existing profiles_owner_all policy is RESTRICTIVE, so we need to recreate as PERMISSIVE

-- Drop the existing RESTRICTIVE ALL policy
DROP POLICY IF EXISTS profiles_owner_all ON public.profiles;

-- Create PERMISSIVE ALL policy for authenticated users to access their own profiles
CREATE POLICY profiles_owner_all
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure grants are correct for authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;