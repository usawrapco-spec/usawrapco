-- vehicle_templates: stores uploaded PVO/silhouette templates for mockup generation
-- Supports exact match (tier 1), class match (tier 2), and AI fallback (tier 3)

CREATE TABLE IF NOT EXISTS vehicle_templates (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  make          text NOT NULL,
  model         text NOT NULL,
  year_start    int,
  year_end      int,
  vehicle_class text, -- sedan, truck, van, suv, box_truck, trailer, marine
  template_url  text NOT NULL,
  template_type text DEFAULT 'pvo', -- pvo, ai_generated, manual
  side_views    jsonb, -- { left: url, right: url, front: url, rear: url, top: url }
  created_by    uuid REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now()
);

-- RLS: any authenticated user can read; owner/admin can write
ALTER TABLE vehicle_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicle_templates_read" ON vehicle_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "vehicle_templates_insert" ON vehicle_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "vehicle_templates_update" ON vehicle_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "vehicle_templates_delete" ON vehicle_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_templates_make_model ON vehicle_templates (make, model);
CREATE INDEX IF NOT EXISTS idx_vehicle_templates_class ON vehicle_templates (vehicle_class);
CREATE INDEX IF NOT EXISTS idx_vehicle_templates_org ON vehicle_templates (org_id);
