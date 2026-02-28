-- Fix 32 remaining auth_rls_initplan warnings via dynamic DO block
-- Fix 83 remaining unindexed foreign keys

-- ── Part 1: auth_rls_initplan — wrap bare auth.uid() ────────────────────
DO $$
DECLARE
  pol RECORD;
  new_qual text;
  new_check text;
  role_clause text;
  perm_clause text;
  fixed int := 0;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
      AND qual::text NOT LIKE '%(select auth.uid()%'
      AND (with_check IS NULL OR with_check::text NOT LIKE '%(select auth.uid()%')
    ORDER BY tablename, policyname
  LOOP
    new_qual  := replace(pol.qual,       'auth.uid()', '(select auth.uid())');
    new_check := replace(pol.with_check, 'auth.uid()', '(select auth.uid())');

    IF pol.roles IS NOT NULL AND cardinality(pol.roles) > 0
       AND pol.roles <> ARRAY['public']::name[] THEN
      role_clause := ' TO ' || array_to_string(pol.roles, ', ');
    ELSE
      role_clause := '';
    END IF;

    IF pol.permissive = 'RESTRICTIVE' THEN
      perm_clause := ' AS RESTRICTIVE';
    ELSE
      perm_clause := '';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);

    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s) WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause, pol.cmd, role_clause, new_qual, new_check
      );
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s)',
        pol.policyname, pol.tablename, perm_clause, pol.cmd, role_clause, new_qual
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause, pol.cmd, role_clause, new_check
      );
    END IF;

    fixed := fixed + 1;
  END LOOP;
  RAISE NOTICE 'auth_rls_initplan: patched % policies (auth.uid)', fixed;
END $$;

-- Patch bare auth.role() too
DO $$
DECLARE
  pol RECORD;
  new_qual text;
  new_check text;
  role_clause text;
  perm_clause text;
  fixed int := 0;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual::text LIKE '%auth.role()%' OR with_check::text LIKE '%auth.role()%')
      AND qual::text NOT LIKE '%(select auth.role()%'
      AND (with_check IS NULL OR with_check::text NOT LIKE '%(select auth.role()%')
    ORDER BY tablename, policyname
  LOOP
    new_qual  := replace(pol.qual,       'auth.role()', '(select auth.role())');
    new_check := replace(pol.with_check, 'auth.role()', '(select auth.role())');

    IF pol.roles IS NOT NULL AND cardinality(pol.roles) > 0
       AND pol.roles <> ARRAY['public']::name[] THEN
      role_clause := ' TO ' || array_to_string(pol.roles, ', ');
    ELSE
      role_clause := '';
    END IF;

    IF pol.permissive = 'RESTRICTIVE' THEN
      perm_clause := ' AS RESTRICTIVE';
    ELSE
      perm_clause := '';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);

    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s) WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause, pol.cmd, role_clause, new_qual, new_check
      );
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s USING (%s)',
        pol.policyname, pol.tablename, perm_clause, pol.cmd, role_clause, new_qual
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I%s FOR %s%s WITH CHECK (%s)',
        pol.policyname, pol.tablename, perm_clause, pol.cmd, role_clause, new_check
      );
    END IF;

    fixed := fixed + 1;
  END LOOP;
  RAISE NOTICE 'auth_rls_initplan: patched % policies (auth.role)', fixed;
END $$;

-- ── Part 2: 83 remaining unindexed foreign keys ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_recaps_project_id ON public.ai_recaps(project_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_initiated_by ON public.call_logs(initiated_by);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_org_id ON public.campaign_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_customer_id ON public.communication_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_org_id ON public.communication_log(org_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_project_id ON public.communication_log(project_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_sent_by ON public.communication_log(sent_by);
CREATE INDEX IF NOT EXISTS idx_communications_sent_by ON public.communications(sent_by);
CREATE INDEX IF NOT EXISTS idx_customer_communications_agent_id ON public.customer_communications(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id ON public.customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_org_id ON public.customer_communications(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_from_customer_id ON public.customer_connections(from_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_org_id ON public.customer_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_to_customer_id ON public.customer_connections(to_customer_id);
CREATE INDEX IF NOT EXISTS idx_design_canvas_versions_created_by ON public.design_canvas_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_design_canvas_versions_design_project_id ON public.design_canvas_versions(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_canvas_versions_org_id ON public.design_canvas_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_design_files_job_id ON public.design_files(job_id);
CREATE INDEX IF NOT EXISTS idx_design_files_org_id ON public.design_files(org_id);
CREATE INDEX IF NOT EXISTS idx_design_presentations_created_by ON public.design_presentations(created_by);
CREATE INDEX IF NOT EXISTS idx_design_presentations_design_project_id ON public.design_presentations(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_presentations_org_id ON public.design_presentations(org_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_assigned_to ON public.email_accounts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_email_accounts_connected_by ON public.email_accounts(connected_by);
CREATE INDEX IF NOT EXISTS idx_emails_conversation_id ON public.emails(conversation_id);
CREATE INDEX IF NOT EXISTS idx_emails_customer_id ON public.emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_email_account_id ON public.emails(email_account_id);
CREATE INDEX IF NOT EXISTS idx_emails_job_id ON public.emails(job_id);
CREATE INDEX IF NOT EXISTS idx_emails_org_id ON public.emails(org_id);
CREATE INDEX IF NOT EXISTS idx_emails_sent_by ON public.emails(sent_by);
CREATE INDEX IF NOT EXISTS idx_employee_pay_settings_vehicle_id ON public.employee_pay_settings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_installer_assignments_installer_id ON public.installer_assignments(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_assignments_project_id ON public.installer_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_gps_checkins_installer_id ON public.installer_gps_checkins(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_gps_checkins_project_id ON public.installer_gps_checkins(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_issues_installer_id ON public.installer_issues(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_issues_project_id ON public.installer_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_issues_resolved_by ON public.installer_issues(resolved_by);
CREATE INDEX IF NOT EXISTS idx_installer_material_usage_installer_id ON public.installer_material_usage(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_material_usage_project_id ON public.installer_material_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_mileage_log_installer_id ON public.installer_mileage_log(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_mileage_log_project_id ON public.installer_mileage_log(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_notes_installer_id ON public.installer_notes(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_notes_project_id ON public.installer_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_job_renders_created_by ON public.job_renders(created_by);
CREATE INDEX IF NOT EXISTS idx_media_packs_created_by ON public.media_packs(created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON public.message_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_invoice_id ON public.payment_milestones(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_schedule_id ON public.payment_milestones(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_org_id ON public.payment_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_sales_order_id ON public.payment_schedules(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_presentation_views_presentation_id ON public.presentation_views(presentation_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_org_id ON public.print_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_project_id ON public.print_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_printer_maintenance_logs_org_id ON public.printer_maintenance_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_proof_annotations_author_id ON public.proof_annotations(author_id);
CREATE INDEX IF NOT EXISTS idx_proof_annotations_proof_id ON public.proof_annotations(proof_id);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_customer_id ON public.proofing_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_design_project_id ON public.proofing_tokens(design_project_id);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_org_id ON public.proofing_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_project_id ON public.proofing_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_org_id ON public.prospect_interactions(org_id);
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_prospect_id ON public.prospect_interactions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_user_id ON public.prospect_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_id ON public.purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_org_id ON public.referral_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner_id ON public.referral_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_render_settings_job_id ON public.render_settings(job_id);
CREATE INDEX IF NOT EXISTS idx_render_settings_org_id ON public.render_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_render_settings_updated_by ON public.render_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_shop_reports_created_by ON public.shop_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_shop_reports_org_id ON public.shop_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_customer_id ON public.signed_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_org_id ON public.signed_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_project_id ON public.signed_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_org_id ON public.time_blocks(org_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_project_id ON public.time_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id ON public.time_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_checked_in_by ON public.vehicle_checkins(checked_in_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_job_id ON public.vehicle_checkins(job_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_org_id ON public.vehicle_checkins(org_id);
CREATE INDEX IF NOT EXISTS idx_wrap_materials_org_id ON public.wrap_materials(org_id);
