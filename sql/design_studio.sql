-- ═══════════════════════════════════════════════════════
-- USA WRAP CO — Design Studio Tables
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── design_projects (ensure extended columns exist) ──
ALTER TABLE design_projects
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS linked_project_id uuid,
  ADD COLUMN IF NOT EXISTS portal_token text DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS canvas_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS vehicle_sqft numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS panels jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS print_specs jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_files jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_brief text,
  ADD COLUMN IF NOT EXISTS inspiration_urls jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS mockup_results jsonb DEFAULT '[]';

-- ── design_files ──
CREATE TABLE IF NOT EXISTS design_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES design_projects(id) ON DELETE CASCADE,
  org_id uuid,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  version int DEFAULT 1,
  parent_file_id uuid,
  is_customer_visible boolean DEFAULT false,
  is_ai_generated boolean DEFAULT false,
  generation_angle text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access_design_files" ON design_files;
CREATE POLICY "org_access_design_files" ON design_files
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── design_annotations ──
CREATE TABLE IF NOT EXISTS design_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES design_projects(id) ON DELETE CASCADE,
  file_id uuid,
  created_by uuid,
  author_name text,
  author_type text DEFAULT 'team',
  annotation_json jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE design_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access_design_annotations" ON design_annotations;
CREATE POLICY "org_access_design_annotations" ON design_annotations
  USING (design_project_id IN (
    SELECT id FROM design_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- ── design_comments (extended) ──
CREATE TABLE IF NOT EXISTS design_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES design_projects(id) ON DELETE CASCADE,
  file_id uuid,
  created_by uuid,
  author_name text,
  author_type text DEFAULT 'team',
  message text,
  parent_id uuid,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access_design_comments" ON design_comments;
CREATE POLICY "org_access_design_comments" ON design_comments
  USING (design_project_id IN (
    SELECT id FROM design_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Public access for customer portal comments
DROP POLICY IF EXISTS "public_insert_design_comments" ON design_comments;
CREATE POLICY "public_insert_design_comments" ON design_comments
  FOR INSERT WITH CHECK (author_type = 'customer');

-- ── design_approvals ──
CREATE TABLE IF NOT EXISTS design_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES design_projects(id) ON DELETE CASCADE,
  approved_by_name text NOT NULL,
  signature_data text,
  approved_at timestamptz DEFAULT now(),
  ip_address text,
  revision_notes text
);

ALTER TABLE design_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access_design_approvals" ON design_approvals;
CREATE POLICY "org_access_design_approvals" ON design_approvals
  USING (design_project_id IN (
    SELECT id FROM design_projects WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS "public_insert_design_approvals" ON design_approvals;
CREATE POLICY "public_insert_design_approvals" ON design_approvals
  FOR INSERT WITH CHECK (true);

-- ── Ensure design_projects has portal_token for customer portal access ──
CREATE INDEX IF NOT EXISTS idx_design_projects_portal_token ON design_projects(portal_token);
CREATE INDEX IF NOT EXISTS idx_design_projects_org_id ON design_projects(org_id);

-- ── design_project_comments — add author_name column if missing ──
ALTER TABLE design_project_comments
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_type text DEFAULT 'team';
