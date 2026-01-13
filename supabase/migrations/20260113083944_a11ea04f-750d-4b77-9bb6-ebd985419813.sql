-- ============================================
-- FIX: Grant authenticated role access to tables
-- Without grants, RLS policies have nothing to work with
-- ============================================

-- Grant SELECT, INSERT, UPDATE, DELETE to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nfts TO authenticated;

-- Ensure anon has NO access (already revoked but confirm)
REVOKE ALL ON profiles FROM anon;
REVOKE ALL ON campaigns FROM anon;
REVOKE ALL ON nfts FROM anon;