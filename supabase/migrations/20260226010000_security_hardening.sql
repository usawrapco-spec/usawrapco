-- =============================================================================
-- Security Hardening Migration
-- Fixes:
--   S-07: Overly permissive RLS policies (USING true / WITH CHECK true)
--   S-08: DB functions missing SET search_path
-- =============================================================================

-- ─── S-08: Fix function search_path to prevent schema injection ────────────

ALTER FUNCTION public.sync_stage_checklist()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_design_mockups_updated_at()
  SET search_path = public, pg_temp;

-- generate_doc_number has args: (prefix text, table_name text, org uuid)
ALTER FUNCTION public.generate_doc_number(text, text, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.auto_number_estimate()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.auto_number_sales_order()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.auto_number_invoice()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.enforce_usawrapco_domain()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;

-- ─── S-07a: Fix deckforge_* tables ───────────────────────────────────────────
-- These tables have no org_id column; scope to authenticated users only.
-- They have a project_id hierarchy (annotations→files→projects).

DROP POLICY IF EXISTS "allow_all_annotations" ON public.deckforge_annotations;
CREATE POLICY "authenticated_access_annotations" ON public.deckforge_annotations
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_all_artboards" ON public.deckforge_artboards;
CREATE POLICY "authenticated_access_artboards" ON public.deckforge_artboards
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_all_files" ON public.deckforge_files;
CREATE POLICY "authenticated_access_files" ON public.deckforge_files
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_all_jobs" ON public.deckforge_jobs;
CREATE POLICY "authenticated_access_deckforge_jobs" ON public.deckforge_jobs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_all_projects" ON public.deckforge_projects;
CREATE POLICY "authenticated_access_deckforge_projects" ON public.deckforge_projects
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── S-07b: Fix design_mockups — restrict INSERT to authenticated users ───────
-- "anyone_can_create_design_mockup" was WITH CHECK(true) — allowed anon inserts
DROP POLICY IF EXISTS "anyone_can_create_design_mockup" ON public.design_mockups;
CREATE POLICY "authenticated_can_create_design_mockup" ON public.design_mockups
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- "service_can_update_design_mockups" was USING(true) — scope to org members
-- (service role bypasses RLS entirely, so existing server-side updates still work)
DROP POLICY IF EXISTS "service_can_update_design_mockups" ON public.design_mockups;
CREATE POLICY "org_can_update_design_mockups" ON public.design_mockups
  FOR UPDATE
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- ─── S-07c: Fix design_proofs UPDATE ─────────────────────────────────────────
-- "Public can update proofs" was USING(true).
-- Customer portal uses service role (bypasses RLS), so we can scope to org members.
-- Unauthenticated customer proof updates go through /api/proof/public/[token]/submit
-- which uses getSupabaseAdmin() (service role) — unaffected by RLS.
DROP POLICY IF EXISTS "Public can update proofs" ON public.design_proofs;
CREATE POLICY "org_members_can_update_proofs" ON public.design_proofs
  FOR UPDATE
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- ─── S-07d: Fix customer_intake UPDATE ───────────────────────────────────────
-- "Public can update by token" was USING(true).
-- Customer intake updates go through /api/onboarding/submit which uses service role.
-- Scope this to prevent arbitrary anon updates via Supabase JS client directly.
DROP POLICY IF EXISTS "Public can update by token" ON public.customer_intake;
CREATE POLICY "Public can update by token" ON public.customer_intake
  FOR UPDATE
  USING (token IS NOT NULL AND completed = false)
  WITH CHECK (token IS NOT NULL);

-- ─── S-07e: Fix design_intake_sessions UPDATE ────────────────────────────────
DROP POLICY IF EXISTS "Public update by token" ON public.design_intake_sessions;
CREATE POLICY "Public update by token" ON public.design_intake_sessions
  FOR UPDATE
  USING (token IS NOT NULL)
  WITH CHECK (token IS NOT NULL);
