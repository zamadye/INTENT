-- =============================================
-- INTENT Platform: 12-Badge System Schema
-- =============================================

-- Drop existing badge-related tables if any (clean slate)
DROP TABLE IF EXISTS public.badge_unlocks CASCADE;
DROP TABLE IF EXISTS public.user_badge_progress CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;

-- =============================================
-- 1. BADGES TABLE - Master badge definitions
-- =============================================
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('identity', 'proof', 'event', 'social')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  visual_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_progression BOOLEAN NOT NULL DEFAULT false,
  progression_order INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  event_window_start TIMESTAMP WITH TIME ZONE,
  event_window_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Public read for badge definitions
CREATE POLICY "badges_public_read" ON public.badges
  FOR SELECT USING (true);

-- Service role for management
CREATE POLICY "badges_service_all" ON public.badges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- 2. USER_BADGE_PROGRESS TABLE - Track user stats
-- =============================================
CREATE TABLE public.user_badge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  
  -- Identity badge progress
  total_transactions INTEGER NOT NULL DEFAULT 0,
  unique_protocols INTEGER NOT NULL DEFAULT 0,
  protocols_interacted TEXT[] NOT NULL DEFAULT '{}'::text[],
  consecutive_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  max_consecutive_days INTEGER NOT NULL DEFAULT 0,
  
  -- Social badge progress (Voice)
  social_shares INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  voice_state INTEGER NOT NULL DEFAULT 0 CHECK (voice_state >= 0 AND voice_state <= 3),
  
  -- Computed scores
  intent_score NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  current_identity_badge TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_progress UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_badge_progress ENABLE ROW LEVEL SECURITY;

-- Owner can read/update their own progress
CREATE POLICY "progress_owner_select" ON public.user_badge_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "progress_owner_update" ON public.user_badge_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Service role for automated updates
CREATE POLICY "progress_service_all" ON public.user_badge_progress
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- 3. BADGE_UNLOCKS TABLE - Record badge unlocks
-- =============================================
CREATE TABLE public.badge_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  
  -- Unlock metadata
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trigger_tx_hash TEXT,
  trigger_event TEXT,
  proof_data JSONB DEFAULT '{}'::jsonb,
  
  -- Display preferences (for event badges)
  is_displayed BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badge_unlocks ENABLE ROW LEVEL SECURITY;

-- Owner can read their unlocks
CREATE POLICY "unlocks_owner_select" ON public.badge_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Owner can update display preferences
CREATE POLICY "unlocks_owner_update" ON public.badge_unlocks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Service role for unlocking
CREATE POLICY "unlocks_service_all" ON public.badge_unlocks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- 4. BADGE_EVENTS TABLE - Event queue for processing
-- =============================================
CREATE TABLE public.badge_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('transaction', 'daily_check', 'social_share', 'event_window')),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "events_service_all" ON public.badge_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================
-- 5. INDEXES for performance
-- =============================================
CREATE INDEX idx_badge_unlocks_user ON public.badge_unlocks(user_id);
CREATE INDEX idx_badge_unlocks_badge ON public.badge_unlocks(badge_id);
CREATE INDEX idx_badge_progress_user ON public.user_badge_progress(user_id);
CREATE INDEX idx_badge_progress_wallet ON public.user_badge_progress(wallet_address);
CREATE INDEX idx_badge_events_unprocessed ON public.badge_events(processed) WHERE processed = false;
CREATE INDEX idx_badges_layer ON public.badges(layer);
CREATE INDEX idx_badges_active ON public.badges(is_active) WHERE is_active = true;

-- =============================================
-- 6. TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON public.badges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON public.user_badge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. SEED DATA: 12 Badge Definitions
-- =============================================

-- LAYER 1: Identity Badges (Progression)
INSERT INTO public.badges (slug, name, description, layer, rarity, is_progression, progression_order, criteria, visual_config) VALUES
('newcomer', 'Newcomer', 'Entry badge for connecting wallet and making your first transaction on Arc', 'identity', 'common', true, 1, 
  '{"min_transactions": 1}'::jsonb,
  '{"nodes": 3, "glow": "minimal", "pattern": "arch-trapezoid"}'::jsonb),
('active', 'Active', 'Awarded for 7 consecutive days of activity across 3+ dApps', 'identity', 'rare', true, 2,
  '{"min_consecutive_days": 7, "min_protocols": 3}'::jsonb,
  '{"nodes": 5, "glow": "medium", "pattern": "complex-topology"}'::jsonb),
('legend', 'Legend', 'The highest tier - 30 consecutive days, 10+ dApps, 100+ transactions', 'identity', 'legendary', true, 3,
  '{"min_consecutive_days": 30, "min_protocols": 10, "min_transactions": 100}'::jsonb,
  '{"nodes": 10, "glow": "maximum", "pattern": "mandala"}'::jsonb);

-- LAYER 2: Proof Badges (Independent)
INSERT INTO public.badges (slug, name, description, layer, rarity, criteria, visual_config) VALUES
('on-chain', 'On-Chain Verified', 'Proof that your wallet activity is verified on the blockchain', 'proof', 'common',
  '{"verified_on_chain": true}'::jsonb,
  '{"style": "verification-mark", "pattern": "arch-integrated"}'::jsonb),
('multi-protocol', 'Multi-Protocol User', 'Interacted with 5+ different verified protocols', 'proof', 'rare',
  '{"min_protocols": 5}'::jsonb,
  '{"nodes": 5, "style": "interconnected", "pattern": "protocol-diversity"}'::jsonb),
('consistent', 'Consistent Contributor', '14 consecutive days of activity without skipping', 'proof', 'epic',
  '{"min_consecutive_days": 14}'::jsonb,
  '{"nodes": 7, "style": "timeline", "pattern": "connected-nodes"}'::jsonb);

-- LAYER 3: Event Badges (Time-limited)
INSERT INTO public.badges (slug, name, description, layer, rarity, criteria, visual_config, event_window_start, event_window_end) VALUES
('genesis-og', 'Genesis Member', 'Connected wallet within 24 hours of INTENT launch - founding member status', 'event', 'legendary',
  '{"first_24h_launch": true}'::jsonb,
  '{"nodes": 10, "glow": "maximum", "accent": "gold", "pattern": "unique"}'::jsonb,
  now(), now() + interval '24 hours'),
('arcflow-witness', 'ArcFlow Witness', 'Early adopter of ArcFlow protocol within 7 days of launch', 'event', 'rare',
  '{"protocol": "arcflow", "within_days": 7}'::jsonb,
  '{"style": "protocol-icon", "pattern": "arch-integrated"}'::jsonb,
  now(), now() + interval '7 days'),
('arc-mainnet', 'Arc Mainnet Pioneer', 'Active on Arc within 24 hours of mainnet launch', 'event', 'legendary',
  '{"mainnet_first_24h": true}'::jsonb,
  '{"nodes": 10, "glow": "maximum", "pattern": "mainnet-specific"}'::jsonb,
  NULL, NULL);

-- LAYER 4: Social Badge (Single badge with states)
INSERT INTO public.badges (slug, name, description, layer, rarity, criteria, visual_config) VALUES
('voice', 'Voice', 'Proof of humanity through social sharing - evolves with engagement', 'social', 'uncommon',
  '{"state_1": {"shares": 1}, "state_2": {"shares": 5}, "state_3": {"shares": 10, "engagement": 100}}'::jsonb,
  '{"nodes_by_state": [3, 5, 7], "glow_by_state": ["basic", "medium", "full"]}'::jsonb);

-- =============================================
-- 8. GRANTS
-- =============================================
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT ON public.badges TO anon;
GRANT SELECT, UPDATE ON public.user_badge_progress TO authenticated;
GRANT SELECT, UPDATE ON public.badge_unlocks TO authenticated;

-- Revoke from anon for sensitive tables
REVOKE ALL ON public.user_badge_progress FROM anon;
REVOKE ALL ON public.badge_unlocks FROM anon;
REVOKE ALL ON public.badge_events FROM anon;
REVOKE ALL ON public.badge_events FROM authenticated;