-- Create SIWE nonces table for replay attack prevention
CREATE TABLE public.siwe_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for efficient cleanup of expired nonces
CREATE INDEX idx_siwe_nonces_expires ON public.siwe_nonces(expires_at);

-- Enable RLS - service_role only access
ALTER TABLE public.siwe_nonces ENABLE ROW LEVEL SECURITY;

-- Only service_role can access nonces table
CREATE POLICY siwe_nonces_service_only ON public.siwe_nonces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Revoke all access from anon and authenticated roles
REVOKE ALL ON public.siwe_nonces FROM anon;
REVOKE ALL ON public.siwe_nonces FROM authenticated;