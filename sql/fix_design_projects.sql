-- ═══════════════════════════════════════════════════════
-- Fix: design_projects table constraints + RLS
-- Run in Supabase SQL Editor
-- Resolves: "No projects" after canvas create
-- ═══════════════════════════════════════════════════════

-- 1. Drop the CHECK constraint on design_type (old migration used snake_case,
--    frontend sends Title Case like 'Full Wrap')
ALTER TABLE public.design_projects
  DROP CONSTRAINT IF EXISTS design_projects_design_type_check;

-- 2. Make title nullable (20260223 migration created it NOT NULL but
--    the frontend insert only sends client_name, not title)
ALTER TABLE public.design_projects
  ALTER COLUMN title DROP NOT NULL;

-- 3. Make created_by nullable (20260219 had it NOT NULL REFERENCES auth.users,
--    but the insert via anon/service key may not always satisfy that FK)
ALTER TABLE public.design_projects
  ALTER COLUMN created_by DROP NOT NULL;

-- 4. Ensure client_name column exists (some schema versions omitted it)
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS client_name text;

-- 5. Ensure design_type column exists with correct default
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS design_type text DEFAULT 'Full Wrap';

-- 6. Ensure description column exists
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS description text;

-- 7. Ensure deadline column exists
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- 8. Ensure designer_id column exists (used by frontend; some schemas had 'assigned_to' instead)
ALTER TABLE public.design_projects
  ADD COLUMN IF NOT EXISTS designer_id uuid;

-- 9. Consolidate RLS — drop old split policies, keep a single ALL policy
DROP POLICY IF EXISTS "design_projects_select_org" ON public.design_projects;
DROP POLICY IF EXISTS "design_projects_insert_org" ON public.design_projects;
DROP POLICY IF EXISTS "design_projects_update_org" ON public.design_projects;
DROP POLICY IF EXISTS "design_projects_delete_admin" ON public.design_projects;
DROP POLICY IF EXISTS "design_projects_all" ON public.design_projects;

-- Re-create a single broad ALL policy: any org member can CRUD their own org's projects
CREATE POLICY "design_projects_all" ON public.design_projects
  FOR ALL USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- 10. Verify: show current row count so you can confirm the table is accessible
SELECT COUNT(*) AS design_project_count FROM public.design_projects;
