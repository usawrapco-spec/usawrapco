-- material_remnants table for tracking leftover vinyl/material pieces
-- Used by RemnantsClient at /inventory/remnants
CREATE TABLE IF NOT EXISTS material_remnants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  material_type text DEFAULT 'vinyl',
  color         text,
  finish        text,
  width_inches  numeric,
  length_inches numeric,
  sqft          numeric,
  status        text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','consumed')),
  from_roll_id  uuid REFERENCES vinyl_inventory(id) ON DELETE SET NULL,
  location      text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE material_remnants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org_access_material_remnants" ON material_remnants
    FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
