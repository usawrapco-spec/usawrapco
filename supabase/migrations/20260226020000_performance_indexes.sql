-- =============================================================================
-- Performance Indexes + RLS Optimization Migration
-- Fixes:
--   P-04: Critical missing indexes on foreign key columns
--   P-05: RLS policies using auth.uid() per-row — wrap in subquery
-- =============================================================================

-- ─── P-04: Critical FK Indexes ───────────────────────────────────────────────
-- Note: CONCURRENTLY cannot run inside a transaction, so using standard CREATE.
-- These are safe — if the index already exists, IF NOT EXISTS prevents errors.

CREATE INDEX IF NOT EXISTS idx_projects_agent_id       ON public.projects(agent_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id    ON public.projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_installer_id   ON public.projects(installer_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by     ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id         ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_convo_id      ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_sent_by       ON public.conversation_messages(sent_by);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_email_log     ON public.conversation_messages(email_log_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned  ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_org_id    ON public.conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_job_comments_project    ON public.job_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor      ON public.activity_log(actor_id);

-- Composite indexes for the most common pipeline query pattern
CREATE INDEX IF NOT EXISTS idx_projects_org_pipe_stage ON public.projects(org_id, pipe_stage);
CREATE INDEX IF NOT EXISTS idx_projects_org_updated    ON public.projects(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_org_status ON public.conversations(org_id, status);

-- ─── P-05: Fix auth_rls_initplan — wrap auth.uid() in subquery ───────────────
-- Postgres evaluates auth.uid() once per row with plain usage.
-- Wrapping in (SELECT auth.uid()) caches it for the whole query — huge speedup.

-- projects
DROP POLICY IF EXISTS "projects_read_same_org_admin_employee" ON public.projects;
CREATE POLICY "projects_read_same_org_admin_employee" ON public.projects
  FOR SELECT USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "projects_insert_admin_employee" ON public.projects;
CREATE POLICY "projects_insert_admin_employee" ON public.projects
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "projects_update_admin_employee" ON public.projects;
CREATE POLICY "projects_update_admin_employee" ON public.projects
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "projects_org_access" ON public.projects;
CREATE POLICY "projects_org_access" ON public.projects
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- profiles
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_read_same_org_admin_employee" ON public.profiles;
CREATE POLICY "profiles_read_same_org_admin_employee" ON public.profiles
  FOR SELECT USING (
    org_id = (SELECT p2.org_id FROM public.profiles p2 WHERE p2.id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "profiles_read_org_members" ON public.profiles;
CREATE POLICY "profiles_read_org_members" ON public.profiles
  FOR SELECT USING (
    org_id = (SELECT p2.org_id FROM public.profiles p2 WHERE p2.id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "profiles_org_access" ON public.profiles;
CREATE POLICY "profiles_org_access" ON public.profiles
  FOR ALL USING (
    org_id = (SELECT p2.org_id FROM public.profiles p2 WHERE p2.id = (SELECT auth.uid()))
  );

-- customers
DROP POLICY IF EXISTS "customers_org_access" ON public.customers;
CREATE POLICY "customers_org_access" ON public.customers
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- estimates (the policy is named "org_access")
DROP POLICY IF EXISTS "org_access" ON public.estimates;
CREATE POLICY "org_access" ON public.estimates
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- invoices
DROP POLICY IF EXISTS "org_access" ON public.invoices;
CREATE POLICY "org_access" ON public.invoices
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- conversations
DROP POLICY IF EXISTS "org members access conversations" ON public.conversations;
CREATE POLICY "org members access conversations" ON public.conversations
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- conversation_messages
DROP POLICY IF EXISTS "org members access messages" ON public.conversation_messages;
CREATE POLICY "org members access messages" ON public.conversation_messages
  FOR ALL USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- job_comments
DROP POLICY IF EXISTS "Users can view comments in their org" ON public.job_comments;
CREATE POLICY "Users can view comments in their org" ON public.job_comments
  FOR SELECT USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert comments in their org" ON public.job_comments;
CREATE POLICY "Users can insert comments in their org" ON public.job_comments
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );
