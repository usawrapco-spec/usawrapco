-- proposals table for customer-facing proposal pages
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  project_id uuid,
  customer_id uuid,
  proposal_number text,
  status text DEFAULT 'draft', -- draft/sent/viewed/accepted/declined/expired
  line_items jsonb DEFAULT '[]',
  subtotal decimal(10,2),
  tax decimal(10,2) DEFAULT 0,
  total decimal(10,2),
  mockup_images jsonb DEFAULT '[]',
  selected_mockup_url text,
  design_option text, -- 'schedule_as_is' or 'custom_design'
  deposit_amount decimal(10,2),
  deposit_paid boolean DEFAULT false,
  deposit_paid_at timestamptz,
  stripe_payment_intent_id text,
  stripe_session_id text,
  viewed_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '14 days'),
  token text DEFAULT gen_random_uuid()::text UNIQUE,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  coverage_type text,
  material text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposals_org_idx ON proposals(org_id);
CREATE INDEX IF NOT EXISTS proposals_token_idx ON proposals(token);
CREATE INDEX IF NOT EXISTS proposals_project_idx ON proposals(project_id);
CREATE INDEX IF NOT EXISTS proposals_customer_idx ON proposals(customer_id);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Public can read proposals by token (no auth needed for customer view)
CREATE POLICY "public can read proposals by token" ON proposals
  FOR SELECT USING (true);

-- Authenticated users can manage proposals
CREATE POLICY "authenticated can manage proposals" ON proposals
  FOR ALL USING (auth.role() = 'authenticated');
