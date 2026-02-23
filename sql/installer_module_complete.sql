-- INSTALLER MODULE COMPLETE BUILD
-- Time tracking, checklists, passive margin, leaderboard

-- ─── Time Blocks Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.installer_time_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_project ON public.installer_time_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_installer ON public.installer_time_blocks(installer_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_started ON public.installer_time_blocks(started_at);

ALTER TABLE public.installer_time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_blocks_select" ON public.installer_time_blocks;
CREATE POLICY "time_blocks_select" ON public.installer_time_blocks FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "time_blocks_insert" ON public.installer_time_blocks;
CREATE POLICY "time_blocks_insert" ON public.installer_time_blocks FOR INSERT WITH CHECK (
  installer_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

DROP POLICY IF EXISTS "time_blocks_update" ON public.installer_time_blocks;
CREATE POLICY "time_blocks_update" ON public.installer_time_blocks FOR UPDATE USING (
  installer_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- ─── Install Checklists ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.install_checklists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checklist_type  TEXT NOT NULL CHECK (checklist_type IN ('pre_install', 'post_install')),
  items           JSONB NOT NULL DEFAULT '[]',
  completed_at    TIMESTAMPTZ,
  signature_data  TEXT,  -- Base64 canvas signature
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, checklist_type)
);

CREATE INDEX IF NOT EXISTS idx_checklists_project ON public.install_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_installer ON public.install_checklists(installer_id);

ALTER TABLE public.install_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklists_select" ON public.install_checklists;
CREATE POLICY "checklists_select" ON public.install_checklists FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "checklists_insert_update" ON public.install_checklists;
CREATE POLICY "checklists_insert_update" ON public.install_checklists
FOR ALL USING (
  installer_id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','production'))
);

-- ─── Default Checklist Items ─────────────────────────────────────────────────
-- Pre-Install Checklist
CREATE TABLE IF NOT EXISTS public.default_checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('pre_install', 'post_install')),
  label       TEXT NOT NULL,
  required    BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default items if none exist
INSERT INTO public.default_checklist_items (org_id, type, label, required, sort_order)
SELECT NULL, 'pre_install', 'Vinyl materials confirmed on hand', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.default_checklist_items WHERE type = 'pre_install' AND org_id IS NULL);

INSERT INTO public.default_checklist_items (org_id, type, label, required, sort_order)
VALUES
(NULL, 'pre_install', 'Vehicle clean and ready', true, 2),
(NULL, 'pre_install', 'Design file approved and printed', true, 3),
(NULL, 'pre_install', 'Install bay prepped', true, 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.default_checklist_items (org_id, type, label, required, sort_order)
VALUES
(NULL, 'post_install', 'All panels smooth, no bubbles', true, 1),
(NULL, 'post_install', 'Edges sealed and tucked', true, 2),
(NULL, 'post_install', 'Vehicle cleaned after install', true, 3),
(NULL, 'post_install', 'Final photos taken', true, 4),
(NULL, 'post_install', 'Customer walkthrough done', true, 5),
(NULL, 'post_install', 'Installer signature captured', true, 6)
ON CONFLICT DO NOTHING;

-- ─── Installer Groups ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.installer_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installer_group_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES public.installer_groups(id) ON DELETE CASCADE,
  installer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, installer_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.installer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_installer ON public.installer_group_members(installer_id);

-- ─── Passive Margin Tracking ─────────────────────────────────────────────────
-- Add columns to installer_bids table
ALTER TABLE public.installer_bids
ADD COLUMN IF NOT EXISTS offered_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS target_rate DECIMAL(10,2) DEFAULT 35,
ADD COLUMN IF NOT EXISTS passive_margin_per_hour DECIMAL(10,2) GENERATED ALWAYS AS (target_rate - COALESCE(offered_rate, 0)) STORED,
ADD COLUMN IF NOT EXISTS estimated_passive_margin DECIMAL(10,2) GENERATED ALWAYS AS ((target_rate - COALESCE(offered_rate, 0)) * COALESCE(hours_budget, 0)) STORED;

-- ─── Installer Leaderboard View ──────────────────────────────────────────────
CREATE OR REPLACE VIEW public.installer_leaderboard AS
SELECT
  p.id as installer_id,
  p.name as installer_name,
  p.org_id,
  COUNT(DISTINCT proj.id) as jobs_completed,
  COALESCE(AVG(tb.duration_minutes / 60.0), 0) as avg_hours,
  COALESCE(SUM(ib.pay_amount), 0) as total_earnings,
  COALESCE(
    AVG(
      CASE
        WHEN proj.pipe_stage IN ('prod_review', 'sales_close', 'done')
        AND proj.actuals->>'qc_result' = 'pass'
        THEN 1.0
        ELSE 0.0
      END
    ) * 100,
    0
  ) as quality_score
FROM public.profiles p
LEFT JOIN public.projects proj ON proj.installer_id = p.id AND proj.pipe_stage IN ('prod_review', 'sales_close', 'done')
LEFT JOIN public.installer_bids ib ON ib.project_id = proj.id AND ib.installer_id = p.id AND ib.status = 'accepted'
LEFT JOIN public.installer_time_blocks tb ON tb.project_id = proj.id AND tb.installer_id = p.id
WHERE p.role = 'installer' AND p.active = true
GROUP BY p.id, p.name, p.org_id;

COMMENT ON VIEW public.installer_leaderboard IS 'Installer performance metrics for leaderboard';
