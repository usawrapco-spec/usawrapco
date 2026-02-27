-- Badge fixes migration
-- 1. Add 12 badge rows that checkAndAwardBadges references but were missing from DB
-- 2. Update closer + speed_demon descriptions to match code criteria
-- 3. Add revisions_used + customer_status to design_proofs if not present

-- ── New badge rows ────────────────────────────────────────────────────────────
INSERT INTO badges (id, name, description, icon, category, division, rarity, xp_value) VALUES
  ('hot_streak',      'Hot Streak',        '7-day login streak',                         '🔥', 'engagement', 'all', 'common',    100),
  ('early_bird',      'Early Bird',        '14-day login streak',                        '🐦', 'engagement', 'all', 'common',    150),
  ('marathon',        'Marathon',          '30-day login streak',                        '🏅', 'engagement', 'all', 'rare',      300),
  ('elite',           'Elite',             'Reached Level 25',                           '💎', 'xp',         'all', 'rare',      500),
  ('sharpshooter',    'Sharpshooter',      '5 deals closed with GPM above 50%',         '🎯', 'sales',      'all', 'rare',      300),
  ('shutterbug',      'Shutterbug',        '50 photos uploaded to jobs',                 '📸', 'production', 'all', 'common',    100),
  ('team_player',     'Team Player',       '5 cross-division referrals',                 '🤜', 'sales',      'all', 'rare',      200),
  ('material_wizard', 'Material Wizard',   '20 vinyl/material usage entries logged',     '🧙', 'production', 'all', 'rare',      250),
  ('pixel_perfect',   'Pixel Perfect',     '5 design proofs approved on first pass',     '✨', 'design',     'all', 'rare',      300),
  ('zero_waste',      'Zero Waste',        'Logged 5 material usage entries',            '♻️', 'production', 'all', 'common',     75),
  ('perfect_brief',   'Perfect Brief',     '5 production stage approvals submitted',     '📋', 'production', 'all', 'rare',      200),
  ('top_dog',         'Top Dog',           'Highest monthly XP in the org',              '🐕', 'xp',         'all', 'legendary', 750)
ON CONFLICT (id) DO NOTHING;

-- ── Fix criteria descriptions to match code logic ─────────────────────────────
UPDATE badges SET description = 'Closed 10 or more deals'
  WHERE id = 'closer';

UPDATE badges SET description = 'Closed a job 2+ days before the scheduled install date'
  WHERE id = 'speed_demon';

-- ── Add columns to design_proofs if they don't exist ─────────────────────────
ALTER TABLE design_proofs ADD COLUMN IF NOT EXISTS revisions_used  INTEGER DEFAULT 0;
ALTER TABLE design_proofs ADD COLUMN IF NOT EXISTS customer_status TEXT    DEFAULT 'pending';
