-- ============================================================================
-- v6.1 Migration: Customer Connections, Onboarding Tokens, Portal enhancements
-- Run against Supabase SQL editor AFTER v6_migration.sql
-- ============================================================================

-- ─── Customer Connections (Network Map) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  customer_a      uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_b      uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  connection_type text NOT NULL CHECK (connection_type IN ('referral','knows','fleet','works_with','family')),
  notes           text,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_connections_org ON customer_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_a ON customer_connections(customer_a);
CREATE INDEX IF NOT EXISTS idx_customer_connections_b ON customer_connections(customer_b);

ALTER TABLE customer_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_connections_select" ON customer_connections FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "customer_connections_insert" ON customer_connections FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "customer_connections_update" ON customer_connections FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "customer_connections_delete" ON customer_connections FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- ─── Onboarding Tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES estimates(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','started','completed','expired')),
  form_data   jsonb NOT NULL DEFAULT '{}',
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_token ON onboarding_tokens(token);

ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Public read by token (no auth needed for onboarding)
CREATE POLICY "onboarding_tokens_select" ON onboarding_tokens FOR SELECT USING (true);
CREATE POLICY "onboarding_tokens_update" ON onboarding_tokens FOR UPDATE USING (true);
CREATE POLICY "onboarding_tokens_insert" ON onboarding_tokens FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- ─── Add referral_source and fleet columns to customers if missing ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referral_source') THEN
    ALTER TABLE customers ADD COLUMN referral_source text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referred_by') THEN
    ALTER TABLE customers ADD COLUMN referred_by uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'fleet_size') THEN
    ALTER TABLE customers ADD COLUMN fleet_size int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'company') THEN
    ALTER TABLE customers ADD COLUMN company text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'lifetime_spend') THEN
    ALTER TABLE customers ADD COLUMN lifetime_spend numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- ─── Communication Log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('call','sms','email','note')),
  direction    text CHECK (direction IN ('inbound','outbound')),
  subject      text,
  body         text,
  duration_sec int,
  logged_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  external_id  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_log_customer ON communication_log(customer_id);

ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communication_log_select" ON communication_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "communication_log_insert" ON communication_log FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
