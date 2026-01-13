-- Step 1: Drop ALL existing policies on profiles
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Step 2: Force RLS (critical - prevents any bypass)
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Step 3: Revoke any implicit grants from anon/public
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON profiles FROM public;

-- Step 4: Create owner-only SELECT policy (authenticated users see only their own profile)
-- Note: profiles.id must reference auth.users.id for this to work
CREATE POLICY profiles_select_owner
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid()::text = wallet_address);

-- Step 5: Create owner-only UPDATE policy
CREATE POLICY profiles_update_owner
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = wallet_address)
WITH CHECK (auth.uid()::text = wallet_address);

-- Step 6: Service role still needs full access for edge functions
CREATE POLICY profiles_service_all
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);