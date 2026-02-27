-- DeckForge schema: add columns and RLS
-- Already applied via MCP, kept here for migration tracking

-- Add missing columns to deckforge_projects
ALTER TABLE deckforge_projects
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS boat_name text,
  ADD COLUMN IF NOT EXISTS boat_make text,
  ADD COLUMN IF NOT EXISTS boat_model text,
  ADD COLUMN IF NOT EXISTS boat_length numeric,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE deckforge_annotations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES deckforge_projects(id) ON DELETE CASCADE;

ALTER TABLE deckforge_jobs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES deckforge_projects(id) ON DELETE CASCADE;

ALTER TABLE deckforge_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deckforge_projects_read" ON deckforge_projects FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL);
CREATE POLICY "deckforge_projects_write" ON deckforge_projects FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL);

ALTER TABLE deckforge_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deckforge_files_access" ON deckforge_files FOR ALL USING (project_id IN (SELECT id FROM deckforge_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL) OR project_id IS NULL);

ALTER TABLE deckforge_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deckforge_annotations_access" ON deckforge_annotations FOR ALL USING (project_id IN (SELECT id FROM deckforge_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL) OR project_id IS NULL);

ALTER TABLE deckforge_artboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deckforge_artboards_access" ON deckforge_artboards FOR ALL USING (project_id IN (SELECT id FROM deckforge_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL) OR project_id IS NULL);

ALTER TABLE deckforge_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deckforge_jobs_access" ON deckforge_jobs FOR ALL USING (project_id IN (SELECT id FROM deckforge_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL) OR project_id IS NULL);
