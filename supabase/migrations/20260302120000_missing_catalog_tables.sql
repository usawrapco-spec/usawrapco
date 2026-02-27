-- Create custom_vehicles table (org-specific vehicle presets for catalog)
CREATE TABLE IF NOT EXISTS custom_vehicles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  year        text,
  make        text,
  model       text,
  vehicle_type text NOT NULL DEFAULT 'car',
  total_sqft  numeric,
  base_price  numeric,
  default_hours numeric,
  default_pay numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage custom vehicles"
  ON custom_vehicles FOR ALL
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Create custom_line_items table (org-specific line item presets)
CREATE TABLE IF NOT EXISTS custom_line_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  name          text NOT NULL,
  description   text,
  default_price numeric,
  category      text NOT NULL DEFAULT 'misc',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage custom line items"
  ON custom_line_items FOR ALL
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Create job_expenses table (per-job expense tracking)
CREATE TABLE IF NOT EXISTS job_expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  project_id  uuid NOT NULL,
  created_by  uuid NOT NULL,
  category    text NOT NULL DEFAULT 'misc',
  description text NOT NULL,
  amount      numeric NOT NULL DEFAULT 0,
  billable    boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE job_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage job expenses"
  ON job_expenses FOR ALL
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
