-- Fix remaining 149 unindexed foreign keys (Phase 4 completion)
-- Generated 2026-02-27 from Supabase performance advisor

CREATE INDEX IF NOT EXISTS idx_ai_comm_rules_created_by ON public.ai_comm_rules(created_by);

CREATE INDEX IF NOT EXISTS idx_ai_message_log_org_id ON public.ai_message_log(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_log_rule_id ON public.ai_message_log(rule_id);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_agent_id ON public.call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_answered_by ON public.call_logs(answered_by);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON public.call_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_department_id ON public.call_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_org_id ON public.call_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_project_id ON public.call_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_transfer_to ON public.call_logs(transfer_to);

CREATE INDEX IF NOT EXISTS idx_call_queue_department_id ON public.call_queue(department_id);
CREATE INDEX IF NOT EXISTS idx_call_queue_org_id ON public.call_queue(org_id);

CREATE INDEX IF NOT EXISTS idx_communications_user_id ON public.communications(user_id);

CREATE INDEX IF NOT EXISTS idx_condition_reports_installer_id ON public.condition_reports(installer_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_project_id ON public.condition_reports(project_id);

CREATE INDEX IF NOT EXISTS idx_contact_list_members_customer_id ON public.contact_list_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_contact_list_members_prospect_id ON public.contact_list_members(prospect_id);

CREATE INDEX IF NOT EXISTS idx_contact_lists_created_by ON public.contact_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_contact_lists_org_id ON public.contact_lists(org_id);

CREATE INDEX IF NOT EXISTS idx_conversation_ai_config_paused_by ON public.conversation_ai_config(paused_by);

CREATE INDEX IF NOT EXISTS idx_conversations_ai_paused_by ON public.conversations(ai_paused_by);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_org_id ON public.coupon_redemptions(org_id);

CREATE INDEX IF NOT EXISTS idx_coupons_customer_id ON public.coupons(customer_id);

CREATE INDEX IF NOT EXISTS idx_deckforge_annotations_file_id ON public.deckforge_annotations(file_id);
CREATE INDEX IF NOT EXISTS idx_deckforge_annotations_job_id ON public.deckforge_annotations(job_id);
CREATE INDEX IF NOT EXISTS idx_deckforge_annotations_project_id ON public.deckforge_annotations(project_id);

CREATE INDEX IF NOT EXISTS idx_deckforge_artboards_project_id ON public.deckforge_artboards(project_id);

CREATE INDEX IF NOT EXISTS idx_deckforge_files_project_id ON public.deckforge_files(project_id);

CREATE INDEX IF NOT EXISTS idx_deckforge_jobs_file_id ON public.deckforge_jobs(file_id);
CREATE INDEX IF NOT EXISTS idx_deckforge_jobs_project_id ON public.deckforge_jobs(project_id);

CREATE INDEX IF NOT EXISTS idx_decking_specs_project_id ON public.decking_specs(project_id);

CREATE INDEX IF NOT EXISTS idx_design_instruction_items_approved_by ON public.design_instruction_items(approved_by);
CREATE INDEX IF NOT EXISTS idx_design_instruction_items_assigned_to ON public.design_instruction_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_design_instruction_items_completed_by ON public.design_instruction_items(completed_by);

CREATE INDEX IF NOT EXISTS idx_design_instructions_created_by ON public.design_instructions(created_by);

CREATE INDEX IF NOT EXISTS idx_design_markups_created_by ON public.design_markups(created_by);

CREATE INDEX IF NOT EXISTS idx_design_mockups_customer_id ON public.design_mockups(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_mockups_project_id ON public.design_mockups(project_id);

CREATE INDEX IF NOT EXISTS idx_design_pin_comments_author_id ON public.design_pin_comments(author_id);

CREATE INDEX IF NOT EXISTS idx_design_pin_replies_author_id ON public.design_pin_replies(author_id);

CREATE INDEX IF NOT EXISTS idx_design_revisions_requested_by ON public.design_revisions(requested_by);

CREATE INDEX IF NOT EXISTS idx_design_video_walkthroughs_created_by ON public.design_video_walkthroughs(created_by);

CREATE INDEX IF NOT EXISTS idx_design_voice_notes_created_by ON public.design_voice_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_email_accounts_org_id ON public.email_accounts(org_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_mailbox_id ON public.email_logs(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sequence_step_send_id ON public.email_logs(sequence_step_send_id);

CREATE INDEX IF NOT EXISTS idx_email_photo_selections_conversation_message_id ON public.email_photo_selections(conversation_message_id);
CREATE INDEX IF NOT EXISTS idx_email_photo_selections_job_image_id ON public.email_photo_selections(job_image_id);

CREATE INDEX IF NOT EXISTS idx_email_sequences_created_by ON public.email_sequences(created_by);
CREATE INDEX IF NOT EXISTS idx_email_sequences_mailbox_id ON public.email_sequences(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_org_id ON public.email_sequences(org_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_org_id ON public.email_templates(org_id);

CREATE INDEX IF NOT EXISTS idx_employee_advances_issued_by ON public.employee_advances(issued_by);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_org_id ON public.escalation_rules(org_id);

CREATE INDEX IF NOT EXISTS idx_expense_reports_approved_by ON public.expense_reports(approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_reports_job_id ON public.expense_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_payroll_run_id ON public.expense_reports(payroll_run_id);

CREATE INDEX IF NOT EXISTS idx_fleet_trips_driver_id ON public.fleet_trips(driver_id);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_added_by ON public.fleet_vehicles(added_by);

CREATE INDEX IF NOT EXISTS idx_gusto_connections_connected_by ON public.gusto_connections(connected_by);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_conversation_id ON public.inbound_emails(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_enrollment_id ON public.inbound_emails(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_org_id ON public.inbound_emails(org_id);

CREATE INDEX IF NOT EXISTS idx_installer_time_blocks_installer_id ON public.installer_time_blocks(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_time_blocks_org_id ON public.installer_time_blocks(org_id);
CREATE INDEX IF NOT EXISTS idx_installer_time_blocks_project_id ON public.installer_time_blocks(project_id);

CREATE INDEX IF NOT EXISTS idx_job_photos_uploaded_by ON public.job_photos(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_org_id ON public.leaderboard_periods(org_id);

CREATE INDEX IF NOT EXISTS idx_line_items_org_id ON public.line_items(org_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_converted_to_project_id ON public.maintenance_reminders(converted_to_project_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_project_id ON public.maintenance_reminders(project_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_assigned_to ON public.maintenance_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_org_id ON public.maintenance_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_original_project_id ON public.maintenance_tickets(original_project_id);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_approved_by ON public.mileage_logs(approved_by);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_job_id ON public.mileage_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_payroll_run_id ON public.mileage_logs(payroll_run_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_leads_converted_customer_id ON public.onboarding_leads(converted_customer_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_leads_org_id ON public.onboarding_leads(org_id);

CREATE INDEX IF NOT EXISTS idx_outreach_mailboxes_org_id ON public.outreach_mailboxes(org_id);

CREATE INDEX IF NOT EXISTS idx_pay_periods_org_id ON public.pay_periods(org_id);

CREATE INDEX IF NOT EXISTS idx_payroll_records_org_id ON public.payroll_records(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_pay_period_id ON public.payroll_records(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_user_id ON public.payroll_records(user_id);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_processed_by ON public.payroll_runs(processed_by);

CREATE INDEX IF NOT EXISTS idx_phone_agents_department_id ON public.phone_agents(department_id);
CREATE INDEX IF NOT EXISTS idx_phone_agents_org_id ON public.phone_agents(org_id);
CREATE INDEX IF NOT EXISTS idx_phone_agents_profile_id ON public.phone_agents(profile_id);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_org_id ON public.phone_numbers(org_id);

CREATE INDEX IF NOT EXISTS idx_portal_messages_org_id ON public.portal_messages(org_id);

CREATE INDEX IF NOT EXISTS idx_portal_quote_approvals_project_id ON public.portal_quote_approvals(project_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_org_id ON public.pricing_rules(org_id);

CREATE INDEX IF NOT EXISTS idx_proposal_packages_proposal_id ON public.proposal_packages(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_selections_package_id ON public.proposal_selections(package_id);
CREATE INDEX IF NOT EXISTS idx_proposal_selections_proposal_id ON public.proposal_selections(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_signatures_customer_id ON public.proposal_signatures(customer_id);

CREATE INDEX IF NOT EXISTS idx_proposal_upsells_proposal_id ON public.proposal_upsells(proposal_id);

CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_created_by ON public.prospecting_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_org_id ON public.prospecting_campaigns(org_id);

CREATE INDEX IF NOT EXISTS idx_prospecting_routes_assigned_to ON public.prospecting_routes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospecting_routes_org_id ON public.prospecting_routes(org_id);

CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON public.prospects(assigned_to);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred_customer_id ON public.referral_tracking(referred_customer_id);

CREATE INDEX IF NOT EXISTS idx_reorder_requests_converted_to_project_id ON public.reorder_requests(converted_to_project_id);
CREATE INDEX IF NOT EXISTS idx_reorder_requests_org_id ON public.reorder_requests(org_id);

CREATE INDEX IF NOT EXISTS idx_review_requests_customer_id ON public.review_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_playbook_created_by ON public.sales_playbook(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_playbook_org_id ON public.sales_playbook(org_id);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_contact_list_member_id ON public.sequence_enrollments(contact_list_member_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_customer_id ON public.sequence_enrollments(customer_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_enrolled_by ON public.sequence_enrollments(enrolled_by);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_org_id ON public.sequence_enrollments(org_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_prospect_id ON public.sequence_enrollments(prospect_id);

CREATE INDEX IF NOT EXISTS idx_sequence_step_sends_email_log_id ON public.sequence_step_sends(email_log_id);
CREATE INDEX IF NOT EXISTS idx_sequence_step_sends_org_id ON public.sequence_step_sends(org_id);
CREATE INDEX IF NOT EXISTS idx_sequence_step_sends_step_id ON public.sequence_step_sends(step_id);

CREATE INDEX IF NOT EXISTS idx_share_photo_packs_created_by ON public.share_photo_packs(created_by);

CREATE INDEX IF NOT EXISTS idx_shop_records_org_id ON public.shop_records(org_id);
CREATE INDEX IF NOT EXISTS idx_shop_records_project_id ON public.shop_records(project_id);
CREATE INDEX IF NOT EXISTS idx_shop_records_record_holder_id ON public.shop_records(record_holder_id);

CREATE INDEX IF NOT EXISTS idx_shop_sessions_converted_to_project_id ON public.shop_sessions(converted_to_project_id);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_customer_id ON public.sms_conversations(customer_id);

CREATE INDEX IF NOT EXISTS idx_sms_templates_created_by ON public.sms_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_supply_requests_approved_by ON public.supply_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_supply_requests_project_id ON public.supply_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_supply_requests_requested_by ON public.supply_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_team_invites_invited_by ON public.team_invites(invited_by);

CREATE INDEX IF NOT EXISTS idx_time_clock_entries_job_id ON public.time_clock_entries(job_id);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_org_id ON public.time_off_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_reviewed_by ON public.time_off_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_user_id ON public.time_off_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_tint_specs_project_id ON public.tint_specs(project_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_org_id ON public.vehicle_maintenance(org_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_created_by ON public.vehicle_photos(created_by);

CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_overrides_org_id ON public.vehicle_pricing_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_overrides_vehicle_id ON public.vehicle_pricing_overrides(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vinyl_context_log_user_id ON public.vinyl_context_log(user_id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_trigger_id ON public.workflow_runs(trigger_id);

CREATE INDEX IF NOT EXISTS idx_workflow_triggers_org_id ON public.workflow_triggers(org_id);

CREATE INDEX IF NOT EXISTS idx_wrap_campaigns_customer_id ON public.wrap_campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_wrap_campaigns_org_id ON public.wrap_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_wrap_campaigns_project_id ON public.wrap_campaigns(project_id);

CREATE INDEX IF NOT EXISTS idx_wrap_funnel_sessions_customer_id ON public.wrap_funnel_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wrap_funnel_sessions_project_id ON public.wrap_funnel_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_wrap_leads_converted_to_campaign_id ON public.wrap_leads(converted_to_campaign_id);

CREATE INDEX IF NOT EXISTS idx_wrap_route_logs_campaign_id ON public.wrap_route_logs(campaign_id);

CREATE INDEX IF NOT EXISTS idx_wrap_tracking_events_campaign_id ON public.wrap_tracking_events(campaign_id);
