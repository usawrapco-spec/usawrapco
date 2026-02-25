-- ============================================================
-- design_projects table — Design Studio kanban
-- ============================================================
CREATE TABLE IF NOT EXISTS public.design_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  client_name TEXT NOT NULL,
  design_type TEXT NOT NULL DEFAULT 'full_wrap'
    CHECK (design_type IN ('full_wrap','partial_wrap','decal','livery','color_change','other')),
  description TEXT,
  deadline    DATE,
  status      TEXT NOT NULL DEFAULT 'brief'
    CHECK (status IN ('brief','in_progress','proof_sent','approved')),
  linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for org-level queries
CREATE INDEX IF NOT EXISTS idx_design_projects_org
  ON public.design_projects(org_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_design_projects_status
  ON public.design_projects(status);

-- Index for linked project lookups
CREATE INDEX IF NOT EXISTS idx_design_projects_linked
  ON public.design_projects(linked_project_id)
  WHERE linked_project_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_design_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_design_projects_updated_at ON public.design_projects;
CREATE TRIGGER trg_design_projects_updated_at
  BEFORE UPDATE ON public.design_projects
  FOR EACH ROW EXECUTE FUNCTION update_design_projects_updated_at();

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;

-- Org members can read all design projects in their org
CREATE POLICY "design_projects_select_org"
  ON public.design_projects FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Authenticated users can insert into their own org
CREATE POLICY "design_projects_insert_org"
  ON public.design_projects FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Org members can update design projects in their org
CREATE POLICY "design_projects_update_org"
  ON public.design_projects FOR UPDATE
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Only admins can delete
CREATE POLICY "design_projects_delete_admin"
  ON public.design_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.org_id = design_projects.org_id
    )
  );
