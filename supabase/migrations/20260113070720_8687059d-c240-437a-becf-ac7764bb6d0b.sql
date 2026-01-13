
-- =============================================================
-- FIX: SECURITY DEFINER VIEW
-- Replace with SECURITY INVOKER (default) view
-- =============================================================

-- Drop the security definer view
DROP VIEW IF EXISTS public.marketplace_transactions_public;

-- Recreate as regular view (SECURITY INVOKER is default)
-- This view respects the RLS policies of the querying user
CREATE VIEW public.marketplace_transactions_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  nft_id,
  price,
  -- Sanitize wallet addresses: show only first 6 and last 4 chars
  CONCAT(LEFT(seller_address, 6), '...', RIGHT(seller_address, 4)) AS seller_masked,
  CONCAT(LEFT(buyer_address, 6), '...', RIGHT(buyer_address, 4)) AS buyer_masked,
  tx_hash,
  created_at
FROM public.marketplace_transactions;

-- Grant read access to the sanitized view
GRANT SELECT ON public.marketplace_transactions_public TO anon, authenticated;

-- The underlying table has service_role only access,
-- so this view will return empty for anon/authenticated users.
-- This is intentional - transaction data is private.
-- For public analytics, use a backend endpoint that aggregates data.
