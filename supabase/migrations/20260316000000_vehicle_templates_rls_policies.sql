-- RLS policies for vehicle_templates
-- Table had RLS enabled but zero policies → all client-side reads returned empty silently

CREATE POLICY "org members can view vehicle templates"
  ON vehicle_templates FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org admins can insert vehicle templates"
  ON vehicle_templates FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org admins can update vehicle templates"
  ON vehicle_templates FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org admins can delete vehicle templates"
  ON vehicle_templates FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
