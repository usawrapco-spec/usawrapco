# USA WRAP CO — AUDIT RESULTS
# Generated: 2026-02-22

## SUMMARY
- **76 page routes** exist and all compile (npm run build passes with zero errors)
- **23 Supabase tables** exist in production
- **15+ critical tables MISSING** — migration SQL files exist in /sql/ but were never run
- **Major features broken** due to missing DB tables (estimates, timeclock, design, inbox, etc.)
- Code quality is high — components are well-structured, dark theme consistent

---

## EXISTING SUPABASE TABLES (23)
app_state, customer_intake, customers, design_proofs, designer_bids,
designer_specialties, install_sessions, installer_bids, job_comments,
job_images, material_tracking, orgs, profiles, projects, proof_settings,
referrals, send_backs, stage_approvals, tasks, team_invites,
vinyl_inventory, vinyl_usage, visibility_settings

## MISSING TABLES (confirmed 404 on REST API)
estimates, line_items, sales_orders, invoices, design_projects,
conversations, messages, time_entries, genie_conversations,
shop_settings, activity_log, contracts, payments, prospects, campaigns

Also likely missing (from migration files):
customer_connections, onboarding_tokens, communication_log, files,
annotations, feedback, approvals, installer_groups, installer_group_members,
installer_bid_recipients, installer_bid_responses, sales_referrals,
job_expenses, card_templates, notifications, integrations,
time_blocks, customer_communications, signed_documents,
referral_codes, referral_tracking, payroll_periods, payroll_entries,
wrap_knowledge_base, tutorial_progress, onboarding_sessions,
estimate_templates, estimate_options, job_history,
campaign_messages, sales_playbook, pricing_rules, escalation_rules,
sourcing_orders, vehicle_database, pto_requests

## MIGRATION FILES (never run)
- sql/v6_migration.sql — estimates, sales_orders, invoices, line_items + RLS
- sql/v6_1_migration.sql — customer_connections, onboarding_tokens, communication_log
- sql/v6_2_migration.sql — customer_communications, contracts, signed_documents, etc.
- sql/v6_2_schema.sql — vehicle_database, time_entries, pto_requests, etc.
- sql/v6_complete_migration.sql — comprehensive migration (all tables)

---

## KNOWN BUGS (Section 30 of REQUIREMENTS.md)

### 1. ESTIMATE CREATION — BROKEN
- **Bug:** Clicking "+ New Estimate" inserts a row into `estimates` table, but table doesn't exist
- **Fallback:** Catches error and redirects to `/estimates/demo-est-1` (demo data)
- **Fix:** Run v6_migration.sql to create estimates + line_items tables

### 2. LINE-ITEM CALCULATORS — PARTIALLY BUILT
- **Status:** EstimateDetailClient.tsx has vehicle categories defined (VEHICLE_CATEGORIES)
- **Has:** Commercial wrap grid (Small Car through Box Truck), PPF, Marine, Trailer, Custom
- **Missing:** Embedded per-line-item calculator UI (currently a static form, not inline)
- **Fix:** Expand EstimateDetailClient to show calculator INSIDE each line item row

### 3. DESIGN STUDIO — BROKEN (DB missing)
- **Route:** /design loads DesignClient.tsx with kanban board UI
- **Bug:** `design_projects` table doesn't exist — INSERT fails silently
- **Canvas:** DesignCanvasClient.tsx exists at /design/[id] but can't load without DB
- **Fix:** Run migration to create design_projects table, ensure columns match

### 4. V.I.N.Y.L. CHAT — PARTIALLY WORKING
- **GenieBar.tsx:** Full ChatGPT-style UI with message bubbles, typing indicator, streaming
- **API route:** /api/ai/genie-chat exists
- **Bug:** "Failed to create conversation" — genie_conversations table missing
- **Fallback:** Component gracefully falls back to demo responses
- **Fix:** Create genie_conversations + conversations + messages tables

### 5. TIMECLOCK — BROKEN (DB missing)
- **Component:** TimeclockClient.tsx is fully built (clock in/out, breaks, weekly timesheet)
- **Page:** /timeclock loads properly with TopNav
- **Bug:** time_entries table doesn't exist — all operations fail
- **Fix:** Run v6_2_schema.sql to create time_entries table

### 6. TEAM MANAGEMENT — EXISTS
- **Route:** /employees loads EmployeesClient.tsx
- **Status:** Functional with profiles table (which exists)

### 7. ANALYTICS — EXISTS (demo data)
- **Route:** /analytics loads AnalyticsPage.tsx
- **Status:** Components exist but likely showing demo/hardcoded data

### 8. VINYL INVENTORY — EXISTS
- **Route:** /inventory loads InventoryClient.tsx
- **Status:** vinyl_inventory table exists, should be functional

### 9. TASKS — EXISTS
- **Route:** /tasks loads TasksClient.tsx
- **Status:** tasks table exists, should be functional

### 10. PDF EXPORTS — EXISTS
- **Routes:** /api/reports/sales-order, /api/reports/production-brief, etc.
- **Status:** Need testing after DB tables are created

---

## PAGE ROUTE STATUS (76 routes)

### Core Pages (all compile, need DB tables)
- /dashboard — Works (DashboardClient.tsx)
- /pipeline — Works (PipelineBoard.tsx)
- /jobs — Works (JobsClient.tsx)
- /jobs/[id] — Works (redirects to projects/[id])
- /projects/[id] — Works (ProjectDetail.tsx)
- /estimates — Shows demo data (table missing)
- /estimates/[id] — Shows demo data (table missing)
- /sales-orders — Shows demo data (table missing)
- /invoices — Shows demo data (table missing)
- /design — UI works, can't save (table missing)
- /design/[id] — Canvas exists, can't load (table missing)
- /timeclock — UI works, can't save (table missing)
- /inbox — UI exists (InboxClient.tsx)
- /contacts — Works
- /customers — Works
- /calendar — Works (CalendarPage.tsx)
- /analytics — Works (demo data)
- /inventory — Works (vinyl_inventory exists)
- /tasks — Works (tasks table exists)
- /settings — Works (SettingsPage.tsx)
- /employees — Works (profiles table)
- /prospects — UI exists
- /campaigns — UI exists
- /network — UI exists (NetworkMapClient.tsx)

### External/Public Pages
- /login — Works
- /intake/[token] — Works
- /proof/[token] — Works
- /onboard/[token] — Works
- /portal — Works
- /demo — Works
- /shop — Works

---

## IMMEDIATE PRIORITIES
1. **Run ALL migration SQL** — This unblocks estimates, design, timeclock, inbox, and more
2. **Fix estimate creation flow** — Should create real DB record and navigate to detail
3. **Fix design project creation** — design_projects table needed
4. **Fix timeclock** — time_entries table needed
5. **Fix V.I.N.Y.L. chat** — conversations/messages tables needed
