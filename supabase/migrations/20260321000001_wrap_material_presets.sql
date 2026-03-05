-- Saved material presets for wrap calculators
-- Stores roll width + cost per linear yard so calcs reflect real supplier pricing

CREATE TABLE IF NOT EXISTS wrap_material_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  name          text NOT NULL,
  brand         text,
  sku           text,
  roll_width_in numeric NOT NULL DEFAULT 54,  -- roll width in inches
  cost_per_yard numeric NOT NULL,             -- $ per linear yard
  notes         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE wrap_material_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage their presets"
  ON wrap_material_presets FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
