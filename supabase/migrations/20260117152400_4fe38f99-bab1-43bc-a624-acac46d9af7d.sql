-- Lock down rate_limits table to service_role only and add explicit deny SELECT policy

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Revoke all table privileges from client-facing roles
REVOKE ALL ON TABLE public.rate_limits FROM anon;
REVOKE ALL ON TABLE public.rate_limits FROM authenticated;
REVOKE ALL ON TABLE public.rate_limits FROM public;

-- Ensure service_role has required privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limits TO service_role;

-- Replace any existing broad policies with service_role-scoped ones
DROP POLICY IF EXISTS rate_limits_service_only ON public.rate_limits;

CREATE POLICY rate_limits_service_only
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly deny SELECT to authenticated users (defense in depth)
DROP POLICY IF EXISTS rate_limits_deny_select_authenticated ON public.rate_limits;
CREATE POLICY rate_limits_deny_select_authenticated
  ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (false);

-- Explicitly deny SELECT to anon users as well
DROP POLICY IF EXISTS rate_limits_deny_select_anon ON public.rate_limits;
CREATE POLICY rate_limits_deny_select_anon
  ON public.rate_limits
  FOR SELECT
  TO anon
  USING (false);