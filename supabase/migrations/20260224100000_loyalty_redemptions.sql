-- Loyalty redemptions table
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points_redeemed INT NOT NULL,
  dollar_value DECIMAL(10,2) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','applied','denied')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer ON loyalty_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_org ON loyalty_redemptions(org_id);

-- RLS
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Customers can view their own redemptions
CREATE POLICY "loyalty_redemptions_customer_read" ON loyalty_redemptions
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can request redemptions
CREATE POLICY "loyalty_redemptions_customer_insert" ON loyalty_redemptions
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Staff can manage all redemptions in their org
CREATE POLICY "loyalty_redemptions_staff" ON loyalty_redemptions
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','owner','sales_agent')
  );

-- Add affiliate_status to referral_codes for affiliate tier tracking
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS affiliate_unlocked BOOLEAN DEFAULT false;
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS affiliate_commission_pct NUMERIC(5,2) DEFAULT 5.0;

-- Add payout tracking to referral_tracking
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS payout_requested BOOLEAN DEFAULT false;
ALTER TABLE referral_tracking ADD COLUMN IF NOT EXISTS payout_requested_at TIMESTAMPTZ;
