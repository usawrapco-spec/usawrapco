-- Expand affiliates.type to include 'sales_agent'
ALTER TABLE affiliates DROP CONSTRAINT IF EXISTS affiliates_type_check;
ALTER TABLE affiliates ADD CONSTRAINT affiliates_type_check
  CHECK (type IN ('dealer','manufacturer','reseller','individual','sales_agent'));

-- Add portal_token column for token-based external portal access
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS portal_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Index for fast portal token lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_portal_token ON affiliates(portal_token);

-- Anon RLS: allow external portal users to read affiliate by portal_token
CREATE POLICY "anon_read_by_portal_token" ON affiliates
  FOR SELECT
  TO anon
  USING (portal_token IS NOT NULL AND status = 'active');

-- Anon RLS: allow reading commissions for portal-accessible affiliates
CREATE POLICY "anon_read_commissions_by_affiliate" ON affiliate_commissions
  FOR SELECT
  TO anon
  USING (affiliate_id IN (
    SELECT id FROM affiliates WHERE portal_token IS NOT NULL AND status = 'active'
  ));
