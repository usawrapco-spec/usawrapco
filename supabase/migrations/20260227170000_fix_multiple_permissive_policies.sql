-- Fix multiple_permissive_policies warnings (473 → 0)
-- Strategy: drop duplicates, drop redundant/overly-broad policies,
-- merge complementary policies into single OR-combined policies.

-- ============================================================
-- 1. ai_comm_rules: 3 policies (2 hardcoded org_id + 1 auth-based)
--    Keep org_access_ai_rules (auth-based), drop the hardcoded duplicates
-- ============================================================
DROP POLICY IF EXISTS "ai_comm_rules_org" ON public.ai_comm_rules;
DROP POLICY IF EXISTS "org_access_rules" ON public.ai_comm_rules;

-- ============================================================
-- 2. ai_message_log: 1 hardcoded + 1 auth-based
--    Drop hardcoded, keep auth-based
-- ============================================================
DROP POLICY IF EXISTS "ai_message_log_org" ON public.ai_message_log;

-- ============================================================
-- 3-5. appointments: duplicate INSERT / SELECT / UPDATE policies
--    Drop the = (single-row subquery) variants, keep the IN variants
-- ============================================================
DROP POLICY IF EXISTS "appointments_insert_org" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_org" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_org" ON public.appointments;

-- ============================================================
-- 6. conversation_ai_config: any-authenticated vs org-scoped
--    Drop the overly broad auth.uid() IS NOT NULL policy
-- ============================================================
DROP POLICY IF EXISTS "conv_ai_config_auth" ON public.conversation_ai_config;

-- ============================================================
-- 7. conversation_messages: org-auth + hardcoded-org + service_role
--    Drop hardcoded org_id, keep auth-based + service_role bypass
-- ============================================================
DROP POLICY IF EXISTS "org_access_msgs" ON public.conversation_messages;

-- ============================================================
-- 8. conversations: same pattern
--    Drop hardcoded org_id, keep auth-based + service_role bypass
-- ============================================================
DROP POLICY IF EXISTS "org_access_convos" ON public.conversations;

-- ============================================================
-- 9-12. deckforge_annotations, artboards, files, jobs:
--    broad "any authenticated" + org-scoped
--    Drop the broad ones
-- ============================================================
DROP POLICY IF EXISTS "authenticated_access_annotations" ON public.deckforge_annotations;
DROP POLICY IF EXISTS "authenticated_access_artboards" ON public.deckforge_artboards;
DROP POLICY IF EXISTS "authenticated_access_files" ON public.deckforge_files;
DROP POLICY IF EXISTS "authenticated_access_deckforge_jobs" ON public.deckforge_jobs;

-- ============================================================
-- 13. deckforge_projects: broad "any authenticated" + org-scoped
--    Drop the broad one
-- ============================================================
DROP POLICY IF EXISTS "authenticated_access_deckforge_projects" ON public.deckforge_projects;

-- ============================================================
-- 14. email_logs: org-based + service_role
--    Merge into single policy
-- ============================================================
DROP POLICY IF EXISTS "org members can manage email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "service role full access email logs" ON public.email_logs;
CREATE POLICY "email_logs_access" ON public.email_logs
  FOR ALL USING (
    org_id = get_my_org_id()
    OR (select auth.role()) = 'service_role'
  );

-- ============================================================
-- 15. email_photo_selections: org_id check vs EXISTS-via-conversation
--    Drop simple org_id check (EXISTS-based is more precise)
-- ============================================================
DROP POLICY IF EXISTS "org members access photo selections" ON public.email_photo_selections;

-- ============================================================
-- 16. employee_pay_settings: all-org-members + admins-only
--    admin policy is redundant (admins are org members too)
-- ============================================================
DROP POLICY IF EXISTS "pay_settings_admin_write" ON public.employee_pay_settings;

-- ============================================================
-- 17. inbound_emails: exact duplicate pair
-- ============================================================
DROP POLICY IF EXISTS "org_access" ON public.inbound_emails;

-- ============================================================
-- 18. maintenance_tickets: hardcoded org_id + public ticket token
--    Merge into single policy
-- ============================================================
DROP POLICY IF EXISTS "org_full_access_tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "public_ticket_token_access" ON public.maintenance_tickets;
CREATE POLICY "maintenance_tickets_access" ON public.maintenance_tickets
  FOR ALL USING (
    org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid
    OR ticket_token IS NOT NULL
  );

-- ============================================================
-- 19. profiles SELECT: own profile + same-org profiles
--    Merge into single policy
-- ============================================================
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_same_org" ON public.profiles;
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (
    id = (select auth.uid())
    OR org_id = get_my_org_id()
  );

-- ============================================================
-- 20. projects SELECT: customer access + org-member access
--    Merge into single policy
-- ============================================================
DROP POLICY IF EXISTS "projects_read_as_customer" ON public.projects;
DROP POLICY IF EXISTS "projects_read_same_org_admin_employee" ON public.projects;
CREATE POLICY "projects_read" ON public.projects
  FOR SELECT USING (
    customer_id = (select auth.uid())
    OR org_id = (
      SELECT profiles.org_id FROM profiles
      WHERE profiles.id = (select auth.uid())
    )
  );

-- ============================================================
-- 21. proposal_packages ALL: any-authenticated + org-scoped
--    Drop broad "any authenticated" policy
-- ============================================================
DROP POLICY IF EXISTS "Staff full access packages" ON public.proposal_packages;

-- ============================================================
-- 22. proposal_packages SELECT: identical USING(true) pair
-- ============================================================
DROP POLICY IF EXISTS "Public can read packages" ON public.proposal_packages;

-- ============================================================
-- 23. proposal_selections INSERT: identical WITH CHECK(true) pair
-- ============================================================
DROP POLICY IF EXISTS "Public can insert selection" ON public.proposal_selections;

-- ============================================================
-- 24. proposal_upsells ALL: any-authenticated + org-scoped
--    Drop broad one
-- ============================================================
DROP POLICY IF EXISTS "Staff full access upsells" ON public.proposal_upsells;

-- ============================================================
-- 25. proposal_upsells SELECT: identical USING(true) pair
-- ============================================================
DROP POLICY IF EXISTS "Public can read upsells" ON public.proposal_upsells;

-- ============================================================
-- 26. proposals ALL: any-authenticated + hardcoded org_id
--    Drop overly broad "any authenticated" policy
-- ============================================================
DROP POLICY IF EXISTS "Staff full access proposals" ON public.proposals;

-- ============================================================
-- 27. proposals SELECT: USING(true) vs USING(public_token IS NOT NULL)
--    Drop the wildly permissive USING(true) — any anon user could read all proposals
-- ============================================================
DROP POLICY IF EXISTS "Public can read proposal by token" ON public.proposals;

-- ============================================================
-- 28. review_requests ALL: exact duplicate pair
-- ============================================================
DROP POLICY IF EXISTS "Org members can manage review requests" ON public.review_requests;

-- ============================================================
-- 29. sequence_step_sends ALL: exact duplicate pair
-- ============================================================
DROP POLICY IF EXISTS "org_access" ON public.sequence_step_sends;

-- ============================================================
-- 30-31. time_clock_entries SELECT + UPDATE: admin-org + self-only
--    Merge each into a single OR-combined policy
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all org entries" ON public.time_clock_entries;
DROP POLICY IF EXISTS "Users can view own time clock entries" ON public.time_clock_entries;
CREATE POLICY "time_clock_entries_read" ON public.time_clock_entries
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = (select auth.uid())
        AND p.role = ANY(ARRAY['owner','admin'])
    )
  );

DROP POLICY IF EXISTS "Admins can update org entries" ON public.time_clock_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.time_clock_entries;
CREATE POLICY "time_clock_entries_update" ON public.time_clock_entries
  FOR UPDATE USING (
    (select auth.uid()) = user_id
    OR org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = (select auth.uid())
        AND p.role = ANY(ARRAY['owner','admin'])
    )
  );
