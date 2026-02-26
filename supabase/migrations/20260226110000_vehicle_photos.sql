-- ─────────────────────────────────────────────────────────────────────────────
-- Vehicle Photos — stores customer vehicle photos with AI analysis results
-- Supports angle detection, panel mapping, and wrap overlay preview
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_photos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  project_id              uuid REFERENCES projects(id) ON DELETE SET NULL,
  design_project_id       uuid,                    -- links to design_projects.id (no FK to allow flexibility)
  storage_path            text NOT NULL,
  public_url              text NOT NULL,
  file_name               text NOT NULL,
  file_type               text NOT NULL,
  file_size_bytes         bigint,

  -- AI-detected angle
  angle                   text,                    -- front | rear | driver_side | passenger_side | 3q_front_driver | 3q_front_passenger | 3q_rear_driver | 3q_rear_passenger | overhead | unknown
  angle_confidence        numeric(3,2),            -- 0.00 – 1.00

  -- AI-detected vehicle info
  vehicle_type            text,                    -- pickup_truck | suv | sedan | van | box_truck
  vehicle_make            text,
  vehicle_model           text,
  vehicle_year            text,
  vehicle_color           text,
  existing_graphics       boolean DEFAULT false,   -- has existing decals / wraps

  -- AI panel detection — array of {panel, bbox:{x,y,w,h}, confidence}
  detected_panels         jsonb,

  -- Suggested 3D template name from VEHICLE_PANELS registry
  suggested_template      text,

  -- Full raw AI response
  ai_analysis             jsonb,
  ai_analyzed_at          timestamptz,

  -- Enhancement results
  bg_removed_url          text,                    -- URL after background removal

  created_by              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS vehicle_photos_org_idx            ON vehicle_photos(org_id);
CREATE INDEX IF NOT EXISTS vehicle_photos_project_idx        ON vehicle_photos(project_id);
CREATE INDEX IF NOT EXISTS vehicle_photos_design_project_idx ON vehicle_photos(design_project_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage vehicle photos"
  ON vehicle_photos FOR ALL
  USING  (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
