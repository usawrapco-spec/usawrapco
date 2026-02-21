-- ============================================================
-- USA WRAP CO — v6.1 Premium Overhaul Migration
-- Run AFTER v6_1_migration.sql
-- ============================================================

-- ── Customer Communications (Unified Inbox) ──────────────────
CREATE TABLE IF NOT EXISTS customer_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  customer_id UUID REFERENCES customers(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'call', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_name TEXT,
  to_name TEXT,
  subject TEXT,
  body TEXT,
  call_duration INTEGER,
  call_notes TEXT,
  read BOOLEAN DEFAULT false,
  agent_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members see their comms" ON customer_communications
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE INDEX idx_comms_org_customer ON customer_communications(org_id, customer_id);
CREATE INDEX idx_comms_created ON customer_communications(created_at DESC);

-- ── Contracts & Signed Documents ─────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  estimate_id UUID,
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired')),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage contracts" ON contracts
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS signed_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  contract_id UUID REFERENCES contracts(id),
  customer_id UUID REFERENCES customers(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_data TEXT,
  ip_address TEXT,
  signed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members see signatures" ON signed_documents
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Referral System ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  code TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'customer' CHECK (type IN ('customer', 'employee', 'partner')),
  owner_id UUID,
  owner_name TEXT,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  commission_pct NUMERIC(5,2) DEFAULT 2.5,
  active BOOLEAN DEFAULT true,
  uses INTEGER DEFAULT 0,
  max_uses INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage referral codes" ON referral_codes
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE UNIQUE INDEX idx_referral_code ON referral_codes(code);

CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  referral_code_id UUID REFERENCES referral_codes(id),
  referred_customer_id UUID REFERENCES customers(id),
  referred_by_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'paid')),
  conversion_value NUMERIC(12,2) DEFAULT 0,
  commission_paid NUMERIC(12,2) DEFAULT 0,
  converted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members see referral tracking" ON referral_tracking
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Payroll ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed')),
  total_payroll NUMERIC(12,2) DEFAULT 0,
  total_commission NUMERIC(12,2) DEFAULT 0,
  total_bonus NUMERIC(12,2) DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins manage payroll" ON payroll_periods
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS payroll_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  period_id UUID REFERENCES payroll_periods(id),
  employee_id UUID REFERENCES profiles(id),
  hours NUMERIC(6,2) DEFAULT 0,
  base_pay NUMERIC(12,2) DEFAULT 0,
  commission NUMERIC(12,2) DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  total_pay NUMERIC(12,2) DEFAULT 0,
  breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins manage payroll entries" ON payroll_entries
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Wrap Knowledge Base ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wrap_knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read knowledge base" ON wrap_knowledge_base
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Tutorial Progress ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  org_id UUID REFERENCES orgs(id),
  step_key TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, step_key)
);

ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their tutorial progress" ON tutorial_progress
  FOR ALL USING (user_id = auth.uid());

-- ── Onboarding Sessions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  customer_id UUID REFERENCES customers(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  steps_completed JSONB DEFAULT '[]',
  data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage onboarding" ON onboarding_sessions
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Indexes for performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_org ON referral_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_org ON payroll_periods(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period ON payroll_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON wrap_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_tutorial_user ON tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_token ON onboarding_sessions(token);
