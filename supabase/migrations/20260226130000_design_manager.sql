-- Design Manager: extended columns, revisions table, designer capacity
-- Migration: 20260226130000_design_manager

-- ─── Extend design_projects ─────────────────────────────────────────────────

ALTER TABLE design_projects
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS brief_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_checklist JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revision_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_limit INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rush_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS design_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- ─── Add designer capacity to profiles ────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS design_capacity INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS design_specialties TEXT[] DEFAULT '{}';

-- ─── Design Revisions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS design_revisions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL,
  design_project_id    UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  round                INT NOT NULL DEFAULT 1,
  notes                TEXT,
  what_changed         TEXT,
  requested_by         UUID REFERENCES profiles(id),
  time_spent_minutes   INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE design_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_org_access" ON design_revisions;
CREATE POLICY "dm_org_access" ON design_revisions
  FOR ALL USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_design_revisions_project
  ON design_revisions(design_project_id);

CREATE INDEX IF NOT EXISTS idx_design_projects_priority
  ON design_projects(priority);

CREATE INDEX IF NOT EXISTS idx_design_projects_escalated
  ON design_projects(escalated) WHERE escalated = TRUE;
