-- ── Dealers ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dealers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  company_name    text,
  email           text,
  phone           text,
  portal_token    text NOT NULL DEFAULT gen_random_uuid()::text,
  sales_rep_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  commission_pct  numeric(5,2) DEFAULT 2.5,
  active          boolean DEFAULT true,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read dealers"
  ON dealers FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = dealers.org_id));

CREATE POLICY "admin can manage dealers"
  ON dealers FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = dealers.org_id AND role IN ('admin','manager')));

CREATE UNIQUE INDEX dealers_portal_token_idx ON dealers(portal_token);
CREATE INDEX dealers_org_idx ON dealers(org_id);

-- ── Dealer Referrals ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dealer_referrals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id         uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
  estimate_id       uuid REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id       uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name     text,
  vehicle_desc      text,
  status            text NOT NULL DEFAULT 'lead',
  -- status flow: lead → estimate → deposit → production → complete → paid
  commission_pct    numeric(5,2),
  commission_amount numeric(10,2),
  paid              boolean DEFAULT false,
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE dealer_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer referrals select" ON dealer_referrals FOR SELECT USING (true);
CREATE POLICY "dealer referrals insert" ON dealer_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "dealer referrals update" ON dealer_referrals FOR UPDATE USING (true);

CREATE INDEX dealer_referrals_dealer_idx ON dealer_referrals(dealer_id);
CREATE INDEX dealer_referrals_project_idx ON dealer_referrals(project_id);

-- ── Dealer Messages (three-way comms) ─────────────────────────────────────────
-- channel: 'dealer_shop' | 'group' | 'customer_shop'
-- sender_type: 'dealer' | 'shop' | 'customer'
CREATE TABLE IF NOT EXISTS dealer_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  referral_id     uuid REFERENCES dealer_referrals(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  channel         text NOT NULL DEFAULT 'group',
  sender_type     text NOT NULL,
  sender_name     text NOT NULL,
  body            text NOT NULL,
  attachment_url  text,
  read_dealer     boolean DEFAULT false,
  read_shop       boolean DEFAULT false,
  read_customer   boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE dealer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealer messages select" ON dealer_messages FOR SELECT USING (true);
CREATE POLICY "dealer messages insert" ON dealer_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "dealer messages update" ON dealer_messages FOR UPDATE USING (true);

CREATE INDEX dealer_messages_dealer_channel_idx ON dealer_messages(dealer_id, channel);
CREATE INDEX dealer_messages_referral_idx ON dealer_messages(referral_id);
