-- Vehicle pricing overrides table
-- Allows shops to customize base prices and install hours per vehicle
CREATE TABLE IF NOT EXISTS vehicle_pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  year INT,
  make TEXT,
  model TEXT,
  base_price DECIMAL(10,2),
  install_hours DECIMAL(4,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, year, make, model)
);

-- RLS policies
ALTER TABLE vehicle_pricing_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org pricing overrides"
  ON vehicle_pricing_overrides FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org pricing overrides"
  ON vehicle_pricing_overrides FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org pricing overrides"
  ON vehicle_pricing_overrides FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
