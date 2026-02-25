-- ============================================================
-- Missing tables: org_config, proposal_packages,
--                 proposal_upsells, proposal_selections
-- Safe to re-run (CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS)
-- ============================================================

-- ── org_config ─────────────────────────────────────────────
-- Generic key/value config store per org.
-- Used by /api/integrations/save and similar endpoints.
CREATE TABLE IF NOT EXISTS org_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  key        text NOT NULL,
  value      text,                      -- JSON string
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, key)
);

CREATE INDEX IF NOT EXISTS org_config_org_key_idx ON org_config(org_id, key);

ALTER TABLE org_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_config: org members" ON org_config;
CREATE POLICY "org_config: org members" ON org_config
  FOR ALL
  USING  (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));


-- ── proposal_packages ──────────────────────────────────────
-- Package tiers within a customer-facing proposal
-- (e.g. "Basic Wrap", "Full Wrap", "Premium Wrap").
CREATE TABLE IF NOT EXISTS proposal_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  badge       text,                     -- e.g. "Most Popular"
  description text,
  price       decimal(10,2) NOT NULL DEFAULT 0,
  includes    jsonb DEFAULT '[]',       -- string[]
  photos      jsonb DEFAULT '[]',       -- url[]
  video_url   text,
  sort_order  int  DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_packages_proposal_idx ON proposal_packages(proposal_id);

ALTER TABLE proposal_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_packages: public read"       ON proposal_packages;
DROP POLICY IF EXISTS "proposal_packages: authenticated all" ON proposal_packages;

CREATE POLICY "proposal_packages: public read" ON proposal_packages
  FOR SELECT USING (true);

CREATE POLICY "proposal_packages: authenticated all" ON proposal_packages
  FOR ALL USING (auth.role() = 'authenticated');


-- ── proposal_upsells ───────────────────────────────────────
-- Optional add-ons shown on a proposal (e.g. window tint, PPF strip).
CREATE TABLE IF NOT EXISTS proposal_upsells (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  price       decimal(10,2) NOT NULL DEFAULT 0,
  photo_url   text,
  badge       text,
  sort_order  int  DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_upsells_proposal_idx ON proposal_upsells(proposal_id);

ALTER TABLE proposal_upsells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_upsells: public read"       ON proposal_upsells;
DROP POLICY IF EXISTS "proposal_upsells: authenticated all" ON proposal_upsells;

CREATE POLICY "proposal_upsells: public read" ON proposal_upsells
  FOR SELECT USING (true);

CREATE POLICY "proposal_upsells: authenticated all" ON proposal_upsells
  FOR ALL USING (auth.role() = 'authenticated');


-- ── proposal_selections ────────────────────────────────────
-- Customer acceptance record: which package + upsells they chose,
-- deposit amount, Stripe payment intent, scheduled date, etc.
CREATE TABLE IF NOT EXISTS proposal_selections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id              uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  package_id               uuid REFERENCES proposal_packages(id) ON DELETE SET NULL,
  upsell_ids               jsonb DEFAULT '[]',   -- uuid[]
  total_amount             decimal(10,2),
  deposit_amount           decimal(10,2),
  stripe_payment_intent_id text,
  deposit_paid_at          timestamptz,
  scheduled_date           date,
  customer_notes           text,
  created_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_selections_proposal_idx ON proposal_selections(proposal_id);

ALTER TABLE proposal_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_selections: public read"       ON proposal_selections;
DROP POLICY IF EXISTS "proposal_selections: public insert"     ON proposal_selections;
DROP POLICY IF EXISTS "proposal_selections: authenticated all" ON proposal_selections;

-- Customers (anon) can read + create selections via proposal token flow
CREATE POLICY "proposal_selections: public read" ON proposal_selections
  FOR SELECT USING (true);

CREATE POLICY "proposal_selections: public insert" ON proposal_selections
  FOR INSERT WITH CHECK (true);

CREATE POLICY "proposal_selections: authenticated all" ON proposal_selections
  FOR ALL USING (auth.role() = 'authenticated');
