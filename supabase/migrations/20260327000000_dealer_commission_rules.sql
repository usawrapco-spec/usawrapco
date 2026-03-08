-- ── Dealer Commission Rules & Estimate Sharing ──────────────────────────────
-- Adds per-job-type commission rules (percentage of GPM or flat rate)
-- and a toggle to share/hide estimates with dealers.

-- Commission rules: per-job-type rates
-- Structure: { "default_pct": 5, "job_types": { "full_wrap": { "type": "percentage", "value": 5 }, ... } }
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS commission_rules jsonb DEFAULT '{}';

-- Toggle: whether the dealer can see estimates for their referrals
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS share_estimates boolean DEFAULT false;

-- Dealer referrals: track job type and how commission was calculated
ALTER TABLE dealer_referrals ADD COLUMN IF NOT EXISTS job_type text;
ALTER TABLE dealer_referrals ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage';
ALTER TABLE dealer_referrals ADD COLUMN IF NOT EXISTS display_amount numeric(10,2);
