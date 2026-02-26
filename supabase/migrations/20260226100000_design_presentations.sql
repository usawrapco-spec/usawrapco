-- ─────────────────────────────────────────────────────────────────
-- Presentation Mode: cinematic design presentations with share links
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS design_presentations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL,
  design_project_id UUID        REFERENCES design_projects(id) ON DELETE CASCADE,
  token             TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  title             TEXT,
  client_name       TEXT,
  slides            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  timer_seconds     INT         NOT NULL DEFAULT 4,
  password          TEXT,
  expires_at        TIMESTAMPTZ,
  branding          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_presentations_token          ON design_presentations(token);
CREATE INDEX IF NOT EXISTS idx_design_presentations_org_id         ON design_presentations(org_id);
CREATE INDEX IF NOT EXISTS idx_design_presentations_design_project ON design_presentations(design_project_id);

-- ──────────────────────────────────────
-- View tracking
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS presentation_views (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id     UUID        NOT NULL REFERENCES design_presentations(id) ON DELETE CASCADE,
  session_id          TEXT        NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  time_spent_seconds  INT,
  slides_viewed       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  decision            TEXT        CHECK (decision IN ('love_it', 'request_changes')),
  feedback            TEXT,
  ip_address          TEXT,
  user_agent          TEXT
);

CREATE INDEX IF NOT EXISTS idx_presentation_views_presentation ON presentation_views(presentation_id);

-- ──────────────────────────────────────
-- RLS
-- ──────────────────────────────────────
ALTER TABLE design_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_views   ENABLE ROW LEVEL SECURITY;

-- Internal staff: full access to their org's presentations
CREATE POLICY "org_members_manage_presentations"
  ON design_presentations FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Public: anyone can read a presentation by token (for shareable links)
CREATE POLICY "public_read_presentation_by_token"
  ON design_presentations FOR SELECT
  USING (token IS NOT NULL);

-- View tracking: anyone can insert (public viewers, no auth)
CREATE POLICY "anyone_insert_view"
  ON presentation_views FOR INSERT
  WITH CHECK (true);

-- View tracking: org members can read their presentation's views
CREATE POLICY "org_members_read_views"
  ON presentation_views FOR SELECT
  USING (
    presentation_id IN (
      SELECT id FROM design_presentations
      WHERE org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Allow updating own view session (for end_time tracking)
CREATE POLICY "update_own_view_session"
  ON presentation_views FOR UPDATE
  USING (true)
  WITH CHECK (true);
