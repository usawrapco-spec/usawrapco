-- Job renders table: tracks AI photorealistic renders per job
CREATE TABLE IF NOT EXISTS job_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  prediction_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','succeeded','failed','canceled')),
  render_url text,
  original_photo_url text,
  prompt text,
  lighting text DEFAULT 'showroom',
  background text DEFAULT 'studio',
  angle text DEFAULT 'original',
  version int DEFAULT 1,
  notes text,
  watermarked boolean DEFAULT false,
  watermark_url text,
  is_multi_angle boolean DEFAULT false,
  angle_set_id uuid,
  cost_credits numeric DEFAULT 0,
  wrap_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Render settings per org (max renders, watermark config)
CREATE TABLE IF NOT EXISTS render_settings (
  org_id uuid PRIMARY KEY,
  max_renders_per_job int DEFAULT 20,
  watermark_text text DEFAULT 'UNCONFIRMED — USA WRAP CO',
  watermark_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE job_renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access_renders" ON job_renders;
CREATE POLICY "org_access_renders" ON job_renders
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

DROP POLICY IF EXISTS "org_write_renders" ON job_renders;
CREATE POLICY "org_write_renders" ON job_renders FOR ALL
  USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

DROP POLICY IF EXISTS "org_access_render_settings" ON render_settings;
CREATE POLICY "org_access_render_settings" ON render_settings
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_renders_project ON job_renders(project_id);
CREATE INDEX IF NOT EXISTS idx_job_renders_status ON job_renders(status);
CREATE INDEX IF NOT EXISTS idx_job_renders_prediction ON job_renders(prediction_id);
CREATE INDEX IF NOT EXISTS idx_job_renders_angle_set ON job_renders(angle_set_id);

-- Default render settings for the org
INSERT INTO render_settings (org_id, max_renders_per_job, watermark_text, watermark_enabled)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 20, 'UNCONFIRMED — USA WRAP CO', true)
ON CONFLICT (org_id) DO NOTHING;
