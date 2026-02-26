-- Canvas version history table
CREATE TABLE IF NOT EXISTS design_canvas_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Version',
  canvas_data JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE design_canvas_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "canvas_versions_org" ON design_canvas_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM design_projects dp
      JOIN profiles p ON p.org_id = dp.org_id
      WHERE dp.id = design_canvas_versions.design_project_id
        AND p.id = auth.uid()
    )
  );

-- Duplicate cleanup log table
CREATE TABLE IF NOT EXISTS duplicate_cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  run_at TIMESTAMPTZ DEFAULT now(),
  duplicates_found INT DEFAULT 0,
  duplicates_deleted INT DEFAULT 0,
  bytes_freed BIGINT DEFAULT 0,
  log_json JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'deleted'))
);

ALTER TABLE duplicate_cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleanup_logs_admin" ON duplicate_cleanup_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
  );

-- Add preferences column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Index for version lookup
CREATE INDEX IF NOT EXISTS idx_canvas_versions_project ON design_canvas_versions(design_project_id, created_at DESC);
