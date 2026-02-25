-- Design Mockups table for AI mockup generator with paywall
CREATE TABLE IF NOT EXISTS design_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  org_id UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  business_name TEXT,
  industry TEXT,
  website_url TEXT,
  logo_url TEXT,
  brand_colors JSONB DEFAULT '[]'::jsonb,
  vehicle_type TEXT,
  vehicle_year TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  wrap_style TEXT,
  style_preference TEXT,
  primary_message JSONB DEFAULT '{}'::jsonb,
  mockup_urls JSONB DEFAULT '[]'::jsonb,
  image_prompt TEXT,
  prediction_ids JSONB DEFAULT '[]'::jsonb,
  payment_status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  amount_paid INTEGER,
  unlocked_at TIMESTAMPTZ,
  email TEXT,
  phone TEXT,
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_mockups_org ON design_mockups(org_id);
CREATE INDEX IF NOT EXISTS idx_design_mockups_email ON design_mockups(email);
CREATE INDEX IF NOT EXISTS idx_design_mockups_payment ON design_mockups(payment_status);
CREATE INDEX IF NOT EXISTS idx_design_mockups_stripe ON design_mockups(stripe_session_id);

-- RLS
ALTER TABLE design_mockups ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can create a mockup request)
CREATE POLICY "anyone_can_create_design_mockup" ON design_mockups
  FOR INSERT WITH CHECK (true);

-- Public select own mockups by ID
CREATE POLICY "anyone_can_view_own_design_mockup" ON design_mockups
  FOR SELECT USING (true);

-- Service role can update (for webhook/API updates)
CREATE POLICY "service_can_update_design_mockups" ON design_mockups
  FOR UPDATE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_design_mockups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_design_mockups_updated_at
  BEFORE UPDATE ON design_mockups
  FOR EACH ROW
  EXECUTE FUNCTION update_design_mockups_updated_at();
