-- Files table: org-level file/media library used by GalleryPicker and gallery API
CREATE TABLE IF NOT EXISTS public.files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name         text NOT NULL,
  url          text NOT NULL,
  file_type    text,
  size         bigint,
  tags         text[] DEFAULT '{}',
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_org       ON public.files(org_id);
CREATE INDEX IF NOT EXISTS idx_files_project   ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_created   ON public.files(created_at DESC);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_select" ON public.files
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "files_insert" ON public.files
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "files_update" ON public.files
  FOR UPDATE USING (org_id = get_my_org_id());

CREATE POLICY "files_delete" ON public.files
  FOR DELETE USING (org_id = get_my_org_id());
