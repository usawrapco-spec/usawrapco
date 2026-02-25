-- v7: Create missing design canvas tables
-- These tables are required by DesignCanvasClient.tsx but were never created in production.

-- ─── design_project_files ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  file_name text,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  version integer DEFAULT 1,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_project_files_project ON public.design_project_files(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_project_files_uploaded_by ON public.design_project_files(uploaded_by);

ALTER TABLE public.design_project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON public.design_project_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.design_projects dp
      WHERE dp.id = design_project_files.design_project_id
        AND dp.org_id = (SELECT profiles.org_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.design_projects dp
      WHERE dp.id = design_project_files.design_project_id
        AND dp.org_id = (SELECT profiles.org_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
  );

-- ─── design_project_comments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id),
  content text NOT NULL,
  author_name text,
  author_type text DEFAULT 'team',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_project_comments_project ON public.design_project_comments(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_project_comments_author ON public.design_project_comments(author_id);

ALTER TABLE public.design_project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON public.design_project_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.design_projects dp
      WHERE dp.id = design_project_comments.design_project_id
        AND dp.org_id = (SELECT profiles.org_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.design_projects dp
      WHERE dp.id = design_project_comments.design_project_id
        AND dp.org_id = (SELECT profiles.org_id FROM public.profiles WHERE profiles.id = auth.uid())
    )
  );

-- ─── Missing columns on design_projects ─────────────────────────────
ALTER TABLE public.design_projects ADD COLUMN IF NOT EXISTS print_export_url text;
ALTER TABLE public.design_projects ADD COLUMN IF NOT EXISTS approval_status text;
ALTER TABLE public.design_projects ADD COLUMN IF NOT EXISTS print_ready_url text;
