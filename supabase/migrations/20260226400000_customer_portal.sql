-- =============================================
-- Customer Portal: customer-level portal tokens
-- =============================================

-- 1. Add portal_token to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS portal_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Back-fill existing rows
UPDATE customers
  SET portal_token = gen_random_uuid()
  WHERE portal_token IS NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_customers_portal_token ON customers(portal_token);

-- 2. Proposal signatures table
CREATE TABLE IF NOT EXISTS proposal_signatures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    uuid NOT NULL,
  customer_id    uuid REFERENCES customers(id) ON DELETE SET NULL,
  signature_data text NOT NULL,
  signer_name    text NOT NULL,
  ip_address     text,
  signed_at      timestamptz DEFAULT now()
);

ALTER TABLE proposal_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_signatures_anon_insert" ON proposal_signatures;
CREATE POLICY "proposal_signatures_anon_insert" ON proposal_signatures
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "proposal_signatures_anon_select" ON proposal_signatures;
CREATE POLICY "proposal_signatures_anon_select" ON proposal_signatures
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "proposal_signatures_team_all" ON proposal_signatures;
CREATE POLICY "proposal_signatures_team_all" ON proposal_signatures
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_proposal_signatures_proposal ON proposal_signatures(proposal_id);

-- 3. Add customer_id to portal_messages (nullable, for customer-level messaging)
ALTER TABLE portal_messages
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portal_messages_customer ON portal_messages(customer_id);
