-- ═══════════════════════════════════════════════════════════════
-- AI Prospector Module Migration
-- Tables: prospects (extend), prospect_interactions, prospecting_routes, prospecting_campaigns
-- ═══════════════════════════════════════════════════════════════

-- Extend prospects table with AI prospecting fields (additive only)
-- The prospects table may already exist, so we ADD columns if missing

DO $$
BEGIN
  -- Add columns to prospects if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='google_place_id') THEN
    ALTER TABLE prospects ADD COLUMN google_place_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='google_rating') THEN
    ALTER TABLE prospects ADD COLUMN google_rating DECIMAL(3,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='google_review_count') THEN
    ALTER TABLE prospects ADD COLUMN google_review_count INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='estimated_fleet_size') THEN
    ALTER TABLE prospects ADD COLUMN estimated_fleet_size INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='estimated_vehicle_types') THEN
    ALTER TABLE prospects ADD COLUMN estimated_vehicle_types TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='annual_revenue_estimate') THEN
    ALTER TABLE prospects ADD COLUMN annual_revenue_estimate TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='employee_count_estimate') THEN
    ALTER TABLE prospects ADD COLUMN employee_count_estimate TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='ai_score') THEN
    ALTER TABLE prospects ADD COLUMN ai_score INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='ai_score_reasoning') THEN
    ALTER TABLE prospects ADD COLUMN ai_score_reasoning TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='ai_suggested_pitch') THEN
    ALTER TABLE prospects ADD COLUMN ai_suggested_pitch TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='lat') THEN
    ALTER TABLE prospects ADD COLUMN lat DECIMAL(10,8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='lng') THEN
    ALTER TABLE prospects ADD COLUMN lng DECIMAL(11,8);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='priority') THEN
    ALTER TABLE prospects ADD COLUMN priority TEXT DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='assigned_to') THEN
    ALTER TABLE prospects ADD COLUMN assigned_to UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='last_contacted_at') THEN
    ALTER TABLE prospects ADD COLUMN last_contacted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='next_follow_up_at') THEN
    ALTER TABLE prospects ADD COLUMN next_follow_up_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='discovered_via') THEN
    ALTER TABLE prospects ADD COLUMN discovered_via TEXT DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='photos') THEN
    ALTER TABLE prospects ADD COLUMN photos TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prospects' AND column_name='contact_title') THEN
    ALTER TABLE prospects ADD COLUMN contact_title TEXT;
  END IF;
END $$;

-- ── Prospect Interactions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospect_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  interaction_type TEXT CHECK (interaction_type IN (
    'call','visit','email','sms','note','quote_sent','follow_up'
  )),
  notes TEXT,
  outcome TEXT CHECK (outcome IN (
    'no_answer','left_voicemail','spoke_with_owner','not_interested',
    'interested','callback_scheduled','quote_requested','won'
  )),
  next_action TEXT,
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Prospecting Routes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospecting_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  name TEXT,
  created_by UUID REFERENCES profiles(id),
  prospect_ids UUID[],
  total_distance_miles DECIMAL(8,2),
  estimated_duration_minutes INT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','active','completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  date_scheduled DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Prospecting Campaigns ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospecting_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  name TEXT,
  description TEXT,
  target_business_types TEXT[],
  target_radius_miles INT DEFAULT 25,
  target_city TEXT,
  target_state TEXT,
  target_zip TEXT,
  ai_auto_run BOOLEAN DEFAULT false,
  ai_run_schedule TEXT,
  ai_max_prospects_per_run INT DEFAULT 50,
  min_ai_score INT DEFAULT 60,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  prospects_found INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospecting_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospecting_campaigns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "org_access_prospects" ON prospects;
DROP POLICY IF EXISTS "org_access_interactions" ON prospect_interactions;
DROP POLICY IF EXISTS "org_access_routes" ON prospecting_routes;
DROP POLICY IF EXISTS "org_access_campaigns" ON prospecting_campaigns;

CREATE POLICY "org_access_prospects" ON prospects
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access_interactions" ON prospect_interactions
  FOR ALL USING (prospect_id IN (SELECT id FROM prospects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "org_access_routes" ON prospecting_routes
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access_campaigns" ON prospecting_campaigns
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
