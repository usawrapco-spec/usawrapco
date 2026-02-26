-- Leaderboards, Divisions, Badges, Tinting, Decking
-- Migration: 20260226300000

-- Add service_division to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS service_division text DEFAULT 'wraps';
-- Values: 'wraps' | 'decking' | 'tinting' | 'ppf' | 'marine'

-- Shop records — all-time bests
CREATE TABLE IF NOT EXISTS shop_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  record_type text NOT NULL,
  record_category text NOT NULL,
  division text DEFAULT 'all',
  record_holder_id uuid REFERENCES profiles(id),
  record_holder_name text,
  record_value numeric NOT NULL,
  record_label text,
  project_id uuid REFERENCES projects(id),
  set_at timestamptz NOT NULL,
  previous_record_value numeric,
  previous_holder_name text,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Leaderboard snapshots
CREATE TABLE IF NOT EXISTS leaderboard_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  period_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  division text DEFAULT 'all',
  category text NOT NULL,
  rankings jsonb NOT NULL,
  computed_at timestamptz DEFAULT now()
);

-- Badges master list
CREATE TABLE IF NOT EXISTS badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  category text,
  division text DEFAULT 'all',
  rarity text DEFAULT 'common',
  xp_value int DEFAULT 100
);

-- User badge awards
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  badge_id text REFERENCES badges(id),
  earned_at timestamptz DEFAULT now(),
  project_id uuid REFERENCES projects(id),
  UNIQUE(user_id, badge_id)
);

-- Tinting job specs
CREATE TABLE IF NOT EXISTS tint_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  film_brand text,
  film_series text,
  vlt_percentage int,
  windows_count int,
  sunroof boolean DEFAULT false,
  windshield boolean DEFAULT false,
  rear_window boolean DEFAULT false,
  door_windows_count int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Decking job specs
CREATE TABLE IF NOT EXISTS decking_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  boat_year text,
  boat_make text,
  boat_model text,
  boat_length_ft numeric,
  decking_brand text DEFAULT 'DekWave',
  decking_color text,
  decking_pattern text,
  total_sqft numeric,
  deck_sections jsonb,
  prep_work_required boolean DEFAULT false,
  old_decking_removal boolean DEFAULT false,
  removal_cost numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add division + badge_id columns to xp_ledger if they don't exist
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS division text DEFAULT 'wraps';
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS badge_id text;

-- Seed badges
INSERT INTO badges VALUES
('first_wrap',      'First Wrap',         'Completed your first wrap job',              '🎉', 'install',    'wraps',    'common',    50),
('gpm_hero',        'GPM Hero',           'Hit 73%+ GPM on a single job',               '💰', 'sales',      'all',      'common',   150),
('gpm_legend',      'GPM Legend',         '90%+ GPM on a job',                          '👑', 'sales',      'all',      'legendary', 500),
('speed_demon',     'Speed Demon',        'Completed a full wrap in under 6 hours',     '⚡', 'install',    'wraps',    'rare',      300),
('fleet_king',      'Fleet King',         'Sold a fleet deal over $10k',                '🚛', 'sales',      'wraps',    'rare',      400),
('boat_master',     'Boat Master',        'Completed 5 marine wraps',                   '⚓', 'install',    'marine',   'rare',      300),
('deck_lord',       'Deck Lord',          'Installed 500+ sqft of DekWave',             '🌊', 'install',    'decking',  'rare',      250),
('tint_pro',        'Tint Pro',           'Completed 20 tint jobs',                     '🕶️', 'install',    'tinting',  'common',    200),
('closer',          'The Closer',         'Closed 3 proposals in one day',              '🤝', 'sales',      'all',      'rare',      350),
('perfect_month',   'Perfect Month',      'Hit all KPI targets in a single month',      '🏆', 'sales',      'all',      'legendary', 1000),
('shop_record',     'Record Breaker',     'Set a new shop record',                      '📈', 'special',    'all',      'legendary', 500),
('zero_comeback',   'Zero Comebacks',     '10 jobs in a row with no QC issues',         '✅', 'production', 'all',      'rare',      300),
('referral_machine','Referral Machine',   'Generated 5 referrals from one customer',   '🔗', 'sales',      'all',      'rare',      200),
('night_shift',     'Night Shift',        'Completed a rush job outside business hours','🌙', 'install',    'all',      'rare',      200),
('boat_wrap_king',  'PNW Boat Wrap King', 'Wrapped 10 boats',                           '🛥️', 'install',    'marine',   'legendary', 750)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE shop_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tint_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decking_specs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON shop_records;
DROP POLICY IF EXISTS "org_access" ON leaderboard_periods;
DROP POLICY IF EXISTS "public_read" ON badges;
DROP POLICY IF EXISTS "user_access" ON user_badges;
DROP POLICY IF EXISTS "org_access" ON tint_specs;
DROP POLICY IF EXISTS "org_access" ON decking_specs;

CREATE POLICY "org_access" ON shop_records USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "org_access" ON leaderboard_periods USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);
CREATE POLICY "public_read" ON badges FOR SELECT USING (true);
CREATE POLICY "user_access" ON user_badges USING (true);
CREATE POLICY "org_access" ON tint_specs USING (true);
CREATE POLICY "org_access" ON decking_specs USING (true);
