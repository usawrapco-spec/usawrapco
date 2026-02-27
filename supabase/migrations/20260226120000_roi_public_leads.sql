-- wrap_leads: captures public ROI funnel submissions (no auth required to insert)
CREATE TABLE IF NOT EXISTS wrap_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',

  -- contact info
  name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  vehicle_type TEXT,

  -- calculator data
  industry TEXT,
  avg_job_value NUMERIC,
  num_vehicles INT DEFAULT 1,
  primary_city TEXT,

  -- route data
  route_waypoints JSONB DEFAULT '[]'::jsonb,
  estimated_daily_impressions INT DEFAULT 0,

  -- generated
  tracking_code TEXT UNIQUE,
  qr_code_url TEXT,

  -- projections
  projected_monthly_leads INT DEFAULT 0,
  projected_annual_revenue NUMERIC DEFAULT 0,
  projected_roi_multiplier NUMERIC DEFAULT 0,

  -- lifecycle
  converted_to_campaign_id UUID REFERENCES wrap_campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wrap_leads_org ON wrap_leads(org_id);
CREATE INDEX IF NOT EXISTS idx_wrap_leads_status ON wrap_leads(status);
CREATE INDEX IF NOT EXISTS idx_wrap_leads_tracking ON wrap_leads(tracking_code);
CREATE INDEX IF NOT EXISTS idx_wrap_leads_email ON wrap_leads(email);

-- RLS
ALTER TABLE wrap_leads ENABLE ROW LEVEL SECURITY;

-- Anonymous users can insert (public funnel)
CREATE POLICY wrap_leads_anon_insert ON wrap_leads
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated org members can read
CREATE POLICY wrap_leads_org_select ON wrap_leads
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Authenticated org members can update
CREATE POLICY wrap_leads_org_update ON wrap_leads
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );
