-- design_intakes table for public onboarding wizard
CREATE TABLE IF NOT EXISTS design_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  customer_name TEXT,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  referral_source TEXT,
  services_requested JSONB,
  vehicle_details JSONB,
  brand_assets JSONB,
  ai_conversation JSONB,
  vision_notes TEXT,
  status TEXT DEFAULT 'new',
  converted_customer_id UUID REFERENCES customers(id),
  converted_project_id UUID REFERENCES projects(id),
  mockup_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE design_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON design_intakes
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

CREATE POLICY "public_insert" ON design_intakes
  FOR INSERT WITH CHECK (true);
