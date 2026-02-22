# AUDIT RESULTS — 2026-02-22

## Build: PASSES (zero errors), 76 routes, 133 components

## Existing Tables (23):
app_state, customer_intake, customers, design_proofs, designer_bids,
designer_specialties, install_sessions, installer_bids, job_comments,
job_images, material_tracking, orgs, profiles, projects, proof_settings,
referrals, send_backs, stage_approvals, tasks, team_invites,
vinyl_inventory, vinyl_usage, visibility_settings

## Missing Tables (critical — code references these but they don't exist):
estimates, line_items, sales_orders, invoices, design_projects,
design_project_comments, design_project_files, conversations, messages,
time_entries, genie_conversations, shop_settings, activity_log, contracts,
signed_documents, payments, prospects, campaigns, campaign_messages,
sales_playbook, pricing_rules, escalation_rules, sourcing_orders,
customer_connections, onboarding_tokens, communication_log,
customer_communications, referral_codes, referral_tracking,
payroll_periods, payroll_entries, wrap_knowledge_base, tutorial_progress,
onboarding_sessions, job_expenses, custom_vehicles, custom_line_items,
material_remnants, project_members, xp_ledger, media_files, print_jobs,
printer_maintenance_logs, files, job_history, estimate_templates,
estimate_options, vehicle_database, pto_requests

## Known Bugs:
1. Estimates: + New creates row in missing table, falls back to demo
2. Design Studio: design_projects table missing — can't create projects
3. V.I.N.Y.L.: conversations/messages tables missing — "Failed to create"
4. Timeclock: time_entries missing — clock in/out fails
5. Many pages show demo data due to missing tables
