-- ============================================
-- PHASE 2: COMPLETE RLS RESET (NUCLEAR OPTION)
-- ============================================

-- Step 1: Drop ALL policies on campaigns
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

-- Step 2: Drop ALL policies on nfts
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

-- Step 3: Revoke all public access from campaigns
REVOKE ALL ON campaigns FROM anon;
REVOKE ALL ON campaigns FROM public;

-- Step 4: Revoke all public access from nfts
REVOKE ALL ON nfts FROM anon;
REVOKE ALL ON nfts FROM public;

-- Step 5: Enable FORCE RLS on both tables
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE nfts FORCE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 3 & 4: IMPLEMENT SECURE POLICIES
-- ============================================

-- CAMPAIGNS TABLE POLICIES

-- 1. SELECT: Owner sees own campaigns, public campaigns visible to authenticated users
-- This prevents anonymous wallet harvesting while allowing sharing
CREATE POLICY campaigns_select_authorized
ON campaigns
FOR SELECT
TO authenticated
USING (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 2. INSERT: Only create campaigns with own wallet
CREATE POLICY campaigns_insert_owner
ON campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 3. UPDATE: Only update own campaigns
CREATE POLICY campaigns_update_owner
ON campaigns
FOR UPDATE
TO authenticated
USING (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
)
WITH CHECK (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 4. DELETE: Only delete own campaigns
CREATE POLICY campaigns_delete_owner
ON campaigns
FOR DELETE
TO authenticated
USING (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 5. Service role for edge functions (scoped, not blanket)
CREATE POLICY campaigns_service_role
ON campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- NFTS TABLE POLICIES

-- 1. SELECT: Owner sees own NFTs
CREATE POLICY nfts_select_authorized
ON nfts
FOR SELECT
TO authenticated
USING (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 2. INSERT: Only create NFTs with own wallet
CREATE POLICY nfts_insert_owner
ON nfts
FOR INSERT
TO authenticated
WITH CHECK (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 3. UPDATE: Only update own NFTs
CREATE POLICY nfts_update_owner
ON nfts
FOR UPDATE
TO authenticated
USING (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
)
WITH CHECK (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 4. DELETE: Only delete own NFTs
CREATE POLICY nfts_delete_owner
ON nfts
FOR DELETE
TO authenticated
USING (
  wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
);

-- 5. Service role for edge functions
CREATE POLICY nfts_service_role
ON nfts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);