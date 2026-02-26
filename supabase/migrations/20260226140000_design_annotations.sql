-- ─────────────────────────────────────────────────────────────────────────
-- Design Annotation & Collaboration System
-- Tables: pin comments, markup strokes, voice notes, video walkthroughs,
--         design instructions + checklist items
-- ─────────────────────────────────────────────────────────────────────────

-- ── Pin Comments ──────────────────────────────────────────────────────────
-- Positioned sticky-notes on the canvas, color-coded by layer/role
CREATE TABLE IF NOT EXISTS design_pin_comments (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id  UUID        NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  layer              TEXT        NOT NULL CHECK (layer IN ('customer', 'designer', 'manager')),
  x_pct              FLOAT       NOT NULL CHECK (x_pct >= 0 AND x_pct <= 100),
  y_pct              FLOAT       NOT NULL CHECK (y_pct >= 0 AND y_pct <= 100),
  content            TEXT        NOT NULL,
  author_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  author_name        TEXT,
  author_avatar      TEXT,
  pin_number         INTEGER     NOT NULL DEFAULT 1,
  resolved           BOOLEAN     NOT NULL DEFAULT FALSE,
  canvas_version     INTEGER     DEFAULT 1,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_pins_project ON design_pin_comments(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_pins_layer   ON design_pin_comments(layer);
CREATE INDEX IF NOT EXISTS idx_design_pins_resolved ON design_pin_comments(resolved);

ALTER TABLE design_pin_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_pins_select" ON design_pin_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_projects dp
      WHERE dp.id = design_project_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "design_pins_insert" ON design_pin_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM design_projects dp
      WHERE dp.id = design_project_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "design_pins_update" ON design_pin_comments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "design_pins_delete" ON design_pin_comments
  FOR DELETE USING (author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

-- ── Pin Replies ────────────────────────────────────────────────────────────
-- Threaded replies on each pin comment
CREATE TABLE IF NOT EXISTS design_pin_replies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id       UUID        NOT NULL REFERENCES design_pin_comments(id) ON DELETE CASCADE,
  author_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  author_name  TEXT,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_replies_pin ON design_pin_replies(pin_id);

ALTER TABLE design_pin_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pin_replies_select" ON design_pin_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_pin_comments pc
        JOIN design_projects dp ON dp.id = pc.design_project_id
      WHERE pc.id = pin_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "pin_replies_insert" ON design_pin_replies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "pin_replies_delete" ON design_pin_replies
  FOR DELETE USING (author_id = auth.uid());

-- ── Markup Strokes ─────────────────────────────────────────────────────────
-- Non-destructive markup overlay: freehand draw, arrows, rectangles, text
-- data JSONB schema:
--   draw:  { points: [{x,y}...] }            (all coords as pct 0-100)
--   arrow: { x1, y1, x2, y2 }
--   rect:  { x, y, width, height }
--   text:  { x, y, text }
CREATE TABLE IF NOT EXISTS design_markups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id UUID        NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  layer             TEXT        NOT NULL CHECK (layer IN ('customer', 'designer', 'manager')),
  markup_type       TEXT        NOT NULL CHECK (markup_type IN ('draw', 'arrow', 'rect', 'text')),
  data              JSONB       NOT NULL DEFAULT '{}',
  color             TEXT        NOT NULL DEFAULT '#4f7fff',
  stroke_width      INTEGER     DEFAULT 2,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_markups_project ON design_markups(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_markups_layer   ON design_markups(layer);

ALTER TABLE design_markups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_markups_select" ON design_markups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_projects dp
      WHERE dp.id = design_project_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "design_markups_insert" ON design_markups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "design_markups_delete" ON design_markups
  FOR DELETE USING (created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

-- ── Voice Notes ────────────────────────────────────────────────────────────
-- Audio recordings attached to pin comments or standalone, with Whisper transcripts
CREATE TABLE IF NOT EXISTS design_voice_notes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id UUID        NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  pin_id            UUID        REFERENCES design_pin_comments(id) ON DELETE SET NULL,
  layer             TEXT        NOT NULL DEFAULT 'designer' CHECK (layer IN ('customer', 'designer', 'manager')),
  audio_url         TEXT        NOT NULL,
  transcript        TEXT,
  duration_seconds  INTEGER,
  replicate_job_id  TEXT,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_voice_notes_project ON design_voice_notes(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_voice_notes_pin     ON design_voice_notes(pin_id);

ALTER TABLE design_voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_voice_notes_select" ON design_voice_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_projects dp
      WHERE dp.id = design_project_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "design_voice_notes_insert" ON design_voice_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "design_voice_notes_update" ON design_voice_notes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "design_voice_notes_delete" ON design_voice_notes
  FOR DELETE USING (created_by = auth.uid());

-- ── Video Walkthroughs ─────────────────────────────────────────────────────
-- Screen recordings (manager walks through design with commentary)
CREATE TABLE IF NOT EXISTS design_video_walkthroughs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id UUID        NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  title             TEXT,
  video_url         TEXT        NOT NULL,
  thumbnail_url     TEXT,
  duration_seconds  INTEGER,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_videos_project ON design_video_walkthroughs(design_project_id);

ALTER TABLE design_video_walkthroughs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_videos_select" ON design_video_walkthroughs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_projects dp
      WHERE dp.id = design_project_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "design_videos_insert" ON design_video_walkthroughs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "design_videos_delete" ON design_video_walkthroughs
  FOR DELETE USING (created_by = auth.uid());

-- ── Design Instructions ────────────────────────────────────────────────────
-- Formal revision requirement sets created by production manager
CREATE TABLE IF NOT EXISTS design_instructions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id UUID        NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_instructions_project ON design_instructions(design_project_id);

ALTER TABLE design_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_instructions_select" ON design_instructions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_projects dp
      WHERE dp.id = design_project_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "design_instructions_insert" ON design_instructions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "design_instructions_delete" ON design_instructions
  FOR DELETE USING (created_by = auth.uid());

-- ── Design Instruction Items ───────────────────────────────────────────────
-- Checklist items within an instruction set (checkbox per revision task)
CREATE TABLE IF NOT EXISTS design_instruction_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id  UUID        NOT NULL REFERENCES design_instructions(id) ON DELETE CASCADE,
  text            TEXT        NOT NULL,
  assigned_to     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  completed_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  approved_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instruction_items_instruction ON design_instruction_items(instruction_id);

ALTER TABLE design_instruction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instruction_items_select" ON design_instruction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM design_instructions di
        JOIN design_projects dp ON dp.id = di.design_project_id
      WHERE di.id = instruction_id
        AND (dp.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "instruction_items_insert" ON design_instruction_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "instruction_items_update" ON design_instruction_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "instruction_items_delete" ON design_instruction_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'production'))
  );
