-- ============================================
-- STANDARDIZE AUTH: Use auth.uid() everywhere
-- ============================================

-- Step 1: Drop all existing policies on campaigns
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'campaigns'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON campaigns', r.policyname);
  END LOOP;
END $$;

-- Step 2: Drop all existing policies on nfts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'nfts'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON nfts', r.policyname);
  END LOOP;
END $$;

-- Step 3: Add user_id column to campaigns (links to auth.users)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- Step 4: Add user_id column to nfts (links to auth.users)
ALTER TABLE nfts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON nfts(user_id);

-- Step 5: Ensure FORCE RLS on both tables
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE nfts FORCE ROW LEVEL SECURITY;

-- Step 6: Revoke public access
REVOKE ALL ON campaigns FROM anon;
REVOKE ALL ON campaigns FROM public;
REVOKE ALL ON nfts FROM anon;
REVOKE ALL ON nfts FROM public;

-- ============================================
-- CAMPAIGNS POLICIES (standardized to auth.uid())
-- ============================================

-- SELECT: Owner sees own campaigns
CREATE POLICY campaigns_select_owner
ON campaigns
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: User creates own campaigns
CREATE POLICY campaigns_insert_owner
ON campaigns
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: User updates own campaigns
CREATE POLICY campaigns_update_owner
ON campaigns
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User deletes own campaigns
CREATE POLICY campaigns_delete_owner
ON campaigns
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role for edge functions
CREATE POLICY campaigns_service_all
ON campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- NFTS POLICIES (standardized to auth.uid())
-- ============================================

-- SELECT: Owner sees own NFTs
CREATE POLICY nfts_select_owner
ON nfts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: User creates own NFTs
CREATE POLICY nfts_insert_owner
ON nfts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: User updates own NFTs
CREATE POLICY nfts_update_owner
ON nfts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User deletes own NFTs
CREATE POLICY nfts_delete_owner
ON nfts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role for edge functions
CREATE POLICY nfts_service_all
ON nfts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PROFILES: Add missing DELETE policy
-- ============================================

-- DELETE: User deletes own profile
CREATE POLICY profiles_delete_owner
ON profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);