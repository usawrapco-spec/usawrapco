-- Estimator Line Items table for the Line Items Engine
CREATE TABLE IF NOT EXISTS estimator_line_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id),
  sort_order int DEFAULT 0,
  is_optional boolean DEFAULT false,
  product_type text NOT NULL,
  item_name text,
  -- Vehicle fields
  vehicle_year text, vehicle_make text, vehicle_model text, coverage text,
  sqft numeric DEFAULT 0, roof_sqft numeric DEFAULT 0, include_roof boolean DEFAULT false,
  -- Box truck fields
  bt_length numeric, bt_height numeric, bt_sides jsonb, bt_cab boolean DEFAULT false,
  -- Trailer fields
  tr_length numeric, tr_height numeric, tr_sides jsonb,
  tr_front_coverage text, tr_vnose text, tr_vnose_h numeric, tr_vnose_l numeric,
  -- Marine fields
  mar_hull_length numeric, mar_hull_height numeric, mar_passes int DEFAULT 2, mar_transom boolean DEFAULT false,
  -- PPF fields
  ppf_selected jsonb DEFAULT '[]',
  -- Pricing fields
  material_id text DEFAULT 'avery1105',
  material_rate numeric DEFAULT 2.10,
  design_fee numeric DEFAULT 150,
  install_rate_mode text DEFAULT 'pct',
  labor_pct numeric DEFAULT 10,
  labor_flat numeric DEFAULT 0,
  target_gpm numeric DEFAULT 75,
  sale_price numeric DEFAULT 0,
  manual_sale boolean DEFAULT false,
  -- Calculated (stored for reporting)
  mat_cost numeric, labor_cost numeric, cogs numeric, profit numeric, gpm numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE estimator_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON estimator_line_items
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_eli_project ON estimator_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_eli_org ON estimator_line_items(org_id);
