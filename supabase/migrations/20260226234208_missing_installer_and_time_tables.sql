-- Create tables referenced in code but missing from the DB
-- Fixes broken installer portal features and payroll hours tracking

-- ── time_blocks ───────────────────────────────────────────────────────────────
-- Used by: /api/payroll/hours, /api/payroll/calculate
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  block_type    TEXT NOT NULL DEFAULT 'work',
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_blocks_org_id_idx       ON public.time_blocks(org_id);
CREATE INDEX IF NOT EXISTS time_blocks_user_id_idx      ON public.time_blocks(user_id);
CREATE INDEX IF NOT EXISTS time_blocks_start_at_idx     ON public.time_blocks(start_at);
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage time_blocks" ON public.time_blocks
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── installer_gps_checkins ────────────────────────────────────────────────────
-- Used by: /api/installer/gps-checkin
CREATE TABLE IF NOT EXISTS public.installer_gps_checkins (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL,
  project_id                  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id                  UUID,
  event_type                  TEXT NOT NULL,
  latitude                    DOUBLE PRECISION NOT NULL,
  longitude                   DOUBLE PRECISION NOT NULL,
  accuracy_meters             DOUBLE PRECISION,
  distance_from_site_meters   DOUBLE PRECISION,
  verified                    BOOLEAN NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installer_gps_project_idx    ON public.installer_gps_checkins(project_id);
CREATE INDEX IF NOT EXISTS installer_gps_installer_idx  ON public.installer_gps_checkins(installer_id);
ALTER TABLE public.installer_gps_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage installer_gps_checkins" ON public.installer_gps_checkins
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── installer_issues ─────────────────────────────────────────────────────────
-- Used by: /api/installer/issues
CREATE TABLE IF NOT EXISTS public.installer_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issue_type    TEXT NOT NULL,
  urgency       TEXT NOT NULL DEFAULT 'medium',
  description   TEXT NOT NULL,
  photos        JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installer_issues_project_idx ON public.installer_issues(project_id);
ALTER TABLE public.installer_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage installer_issues" ON public.installer_issues
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── installer_material_usage ──────────────────────────────────────────────────
-- Used by: /api/installer/material-usage
CREATE TABLE IF NOT EXISTS public.installer_material_usage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vinyl_type          TEXT,
  vinyl_color         TEXT,
  vinyl_sku           TEXT,
  linear_feet_used    DOUBLE PRECISION,
  sq_ft_used          DOUBLE PRECISION,
  laminate_used       BOOLEAN NOT NULL DEFAULT false,
  laminate_sq_ft      DOUBLE PRECISION,
  leftover_linear_ft  DOUBLE PRECISION,
  leftover_sq_ft      DOUBLE PRECISION,
  estimated_sq_ft     DOUBLE PRECISION,
  waste_percentage    DOUBLE PRECISION,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installer_mat_project_idx ON public.installer_material_usage(project_id);
ALTER TABLE public.installer_material_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage installer_material_usage" ON public.installer_material_usage
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── installer_mileage_log ─────────────────────────────────────────────────────
-- Used by: /api/installer/mileage
CREATE TABLE IF NOT EXISTS public.installer_mileage_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL,
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_address          TEXT,
  to_address            TEXT,
  miles                 DOUBLE PRECISION NOT NULL,
  tracking_method       TEXT NOT NULL DEFAULT 'manual',
  trip_date             DATE NOT NULL,
  notes                 TEXT,
  reimbursement_amount  DOUBLE PRECISION NOT NULL DEFAULT 0,
  reimbursement_status  TEXT NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installer_mileage_installer_idx ON public.installer_mileage_log(installer_id);
CREATE INDEX IF NOT EXISTS installer_mileage_project_idx   ON public.installer_mileage_log(project_id);
ALTER TABLE public.installer_mileage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage installer_mileage_log" ON public.installer_mileage_log
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ── installer_notes ───────────────────────────────────────────────────────────
-- Used by: /api/installer/notes
CREATE TABLE IF NOT EXISTS public.installer_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_text     TEXT NOT NULL,
  note_tag      TEXT NOT NULL DEFAULT 'general',
  photo_url     TEXT,
  is_voice      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS installer_notes_project_idx ON public.installer_notes(project_id);
ALTER TABLE public.installer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage installer_notes" ON public.installer_notes
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
