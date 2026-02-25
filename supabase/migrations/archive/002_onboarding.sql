-- Onboarding leads table for /get-started funnel
CREATE TABLE IF NOT EXISTS onboarding_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  full_name text,
  email text,
  phone text,
  business_name text,
  project_type text,
  purpose text,
  vehicle_year int,
  vehicle_make text,
  vehicle_model text,
  vehicle_vin text,
  coverage_type text,
  addons jsonb DEFAULT '[]',
  total_price numeric,
  deposit_amount numeric DEFAULT 250,
  design_notes text,
  logo_url text,
  referral_source text,
  stripe_session_id text,
  stripe_payment_status text DEFAULT 'pending',
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE onboarding_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (unauthenticated leads)
CREATE POLICY "public_insert_onboarding_leads"
  ON onboarding_leads FOR INSERT
  WITH CHECK (true);

-- Only org members can read
CREATE POLICY "org_read_onboarding_leads"
  ON onboarding_leads FOR SELECT
  USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('owner','admin','sales_agent')
    )
  );
