-- ============================================================
-- Security fixes: function search_path + overly-permissive RLS policies
-- Performance fixes: indexes on unindexed foreign keys
-- Generated from Supabase security + performance advisor (2026-02-27)
-- Applied in two migrations: security_fixes + performance_indexes
-- ============================================================

-- SECURITY: Fix function search_path (prevents search_path injection)
ALTER FUNCTION public.get_my_org_id() SET search_path = public;
ALTER FUNCTION public.sync_customers_aliases() SET search_path = public;
ALTER FUNCTION public.sync_sales_referrals_aliases() SET search_path = public;
ALTER FUNCTION public.sync_xp_ledger_aliases() SET search_path = public;

-- SECURITY: Replace USING(true) RLS with org-scoped policies

DROP POLICY IF EXISTS "org_access_ai_rules" ON ai_comm_rules;
CREATE POLICY "org_access_ai_rules" ON ai_comm_rules
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_access_ai_log" ON ai_message_log;
CREATE POLICY "org_access_ai_log" ON ai_message_log
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_access_campaigns" ON broadcast_campaigns;
CREATE POLICY "org_access_campaigns" ON broadcast_campaigns
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_access_inbound_emails" ON inbound_emails;
CREATE POLICY "org_access_inbound_emails" ON inbound_emails
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "installer_payroll_records_all" ON installer_payroll_records;
CREATE POLICY "installer_payroll_records_all" ON installer_payroll_records
  FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "rate_card_settings_all" ON rate_card_settings;
CREATE POLICY "rate_card_settings_all" ON rate_card_settings
  FOR ALL TO authenticated
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "all_access_step_sends" ON sequence_step_sends;
CREATE POLICY "all_access_step_sends" ON sequence_step_sends
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_access_ai_config" ON conversation_ai_config;
CREATE POLICY "org_access_ai_config" ON conversation_ai_config
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "org_full_access_notifications" ON customer_notifications;
CREATE POLICY "org_full_access_notifications" ON customer_notifications
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "org_full_access_vehicles" ON customer_vehicles;
CREATE POLICY "org_full_access_vehicles" ON customer_vehicles
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "org_access" ON decking_specs;
CREATE POLICY "org_access" ON decking_specs
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "org_access" ON tint_specs;
CREATE POLICY "org_access" ON tint_specs
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "user_access" ON user_badges;
CREATE POLICY "user_access" ON user_badges
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- PERFORMANCE: Indexes on unindexed foreign keys (high-traffic tables)
-- Note: applied separately without CONCURRENTLY (migration runs in a transaction)
CREATE INDEX IF NOT EXISTS idx_messages_org_id          ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id      ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id     ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id         ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to        ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by         ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id      ON time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id  ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id     ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_installer_id ON time_entries(installer_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_usage_project_id   ON vinyl_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_usage_vinyl_id     ON vinyl_usage(vinyl_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_usage_recorded_by  ON vinyl_usage(recorded_by);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_org_id      ON sourcing_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_project_id  ON sourcing_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_created_by  ON sourcing_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_org_id          ON sales_referrals(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_project_id      ON sales_referrals(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_referring_user  ON sales_referrals(referring_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_receiving_user  ON sales_referrals(receiving_user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id         ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by     ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_customer_id    ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id    ON proposals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_send_backs_sent_by       ON send_backs(sent_by);
CREATE INDEX IF NOT EXISTS idx_send_backs_resolved_by   ON send_backs(resolved_by);
CREATE INDEX IF NOT EXISTS idx_stage_approvals_by       ON stage_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_project_id     ON xp_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id      ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_project_id   ON user_badges(project_id);
CREATE INDEX IF NOT EXISTS idx_fishing_regs_species_id  ON fishing_regulations(species_id);
CREATE INDEX IF NOT EXISTS idx_catch_log_species_id     ON catch_log(species_id);
CREATE INDEX IF NOT EXISTS idx_catch_log_spot_id        ON catch_log(spot_id);
CREATE INDEX IF NOT EXISTS idx_gusto_exports_exported_by  ON gusto_exports(exported_by);
CREATE INDEX IF NOT EXISTS idx_job_renders_project_id     ON job_renders(project_id);
CREATE INDEX IF NOT EXISTS idx_job_renders_requested_by   ON job_renders(requested_by);
CREATE INDEX IF NOT EXISTS idx_affiliates_org_id        ON affiliates(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id       ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_comm_org_id    ON affiliate_commissions(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_comm_aff_id    ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_comm_proj_id   ON affiliate_commissions(project_id);
CREATE INDEX IF NOT EXISTS idx_calls_org_id             ON calls(org_id);
CREATE INDEX IF NOT EXISTS idx_calls_customer_id        ON calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_calls_project_id         ON calls(project_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id            ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_work_summaries_org_id    ON work_summaries(org_id);
CREATE INDEX IF NOT EXISTS idx_work_summaries_user_id   ON work_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_pay_settings_org_id  ON employee_pay_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_design_proofs_designer   ON design_proofs(designer_id);
CREATE INDEX IF NOT EXISTS idx_design_proofs_sent_by    ON design_proofs(sent_by);
CREATE INDEX IF NOT EXISTS idx_material_tracking_by     ON material_tracking(logged_by);
CREATE INDEX IF NOT EXISTS idx_job_comments_author_id   ON job_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_job_images_user_id       ON job_images(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_log_org_id     ON ai_agents_log(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_log_user_id    ON ai_agents_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_id      ON ai_usage_log(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id     ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org_id         ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by     ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_id     ON workflow_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_org_id    ON referral_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_proj_id   ON referral_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer  ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_media_files_org_id       ON media_files(org_id);
CREATE INDEX IF NOT EXISTS idx_media_files_project_id   ON media_files(project_id);
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by  ON media_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_comms_org_id             ON communications(org_id);
CREATE INDEX IF NOT EXISTS idx_comms_customer_id        ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_comms_project_id         ON communications(project_id);
