CREATE TABLE IF NOT EXISTS design_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text,
  image_url text,
  storage_path text,
  tags text[],
  vehicle_type text,
  themes text[],
  colors text[],
  industry text,
  source text DEFAULT 'ai_generated',
  project_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS design_library_org_idx ON design_library(org_id);
CREATE INDEX IF NOT EXISTS design_library_vehicle_idx ON design_library(vehicle_type);

ALTER TABLE design_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can view library" ON design_library FOR SELECT USING (true);
CREATE POLICY "authenticated can insert library" ON design_library FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "creator can update library" ON design_library FOR UPDATE USING (created_by = auth.uid());
