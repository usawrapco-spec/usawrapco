# USA WRAP CO — Site Audit Report
**Date:** 2026-02-27
**Build Status:** PASSING (397 pages, 0 TypeScript errors)
**Version:** v6.2

---

## Phase 1 — Build & Nav Audit

### Build Fixes Applied (TypeScript null-check errors)

| File | Error | Fix |
|------|-------|-----|
| `app/design-studio/[job_id]/page.tsx` | `params` possibly null | `params?.job_id` |
| `app/design/[id]/print-layout/page.tsx` | `params` possibly null | `params?.id` |
| `app/portal/proof/[token]/page.tsx` | `params` possibly null | `params?.token` |
| `app/presentation/[token]/page.tsx` | `params` possibly null | `params?.token` |
| `app/roi/[campaignId]/page.tsx` | `params` possibly null | `params?.campaignId` |
| `app/roi/[campaignId]/route-mapper/page.tsx` | `params` possibly null | `params?.campaignId` |
| `components/design/DesignStudioLayout.tsx` | `pathname` null index | `pathname ?` guard |
| `components/intake/WrapFunnelClient.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/jobs/JobsClient.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/pipeline/UnifiedJobBoard.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/settings/EmailAccountsClient.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/layout/SideNav.tsx` | `pathname` null param | null guard in `isActiveRoute` |
| `components/layout/TopBar.tsx` | `pathname` null index | `pathname ?` guard |
| `components/layout/TopNav.tsx` | `pathname` possibly null | null guard in `isActiveLink` |
| `components/portal/PortalShell.tsx` | `pathname` possibly null | null guard in `isActive` |

### Sidebar Nav Links — All Valid

All 39 sidebar links point to existing page.tsx files. Zero broken nav links.

| Section | Links | Status |
|---------|-------|--------|
| SALES | Dashboard, Pipeline, Estimates, Proposals, Customers, Calendar | ALL OK |
| PRODUCTION | Jobs, Production Queue, Install Schedule, QC | ALL OK |
| DESIGN | Design Studio, Brand Assets, Mockups | ALL OK |
| FINANCE | Invoices, Payments, Transactions, Expenses, Payroll (x4), Commission, Reports, Overhead | ALL OK |
| TEAM | Staff, Leaderboard, Time Tracking | ALL OK |
| MARKETING | Affiliates, Outbound CRM, Campaigns | ALL OK |
| MARINE/FISHING | 9 pages | ALL OK |
| SETTINGS | General, Defaults, Commissions, Reviews, Process, Integrations | ALL OK |

### Build Summary

| Metric | Value |
|--------|-------|
| Total page.tsx files | ~185 |
| Total API route.ts files | ~200+ |
| Total pages built | 397 |
| Sidebar nav links | 39 |
| Broken sidebar links | 0 |
| Build errors before audit | 15 TypeScript errors |
| Build errors after audit | 0 |

---

## Phase 2 — Content Quality Check (New Pages)

### Fishing Module (app/fishing/* — 9 pages)
All 9 pages confirmed production-quality:
- `force-dynamic`, auth-guarded server components
- Real Supabase queries via admin client
- No mock/placeholder data

**Bug fixed:** `FishingSpotsClient.tsx` had `latitude`/`longitude` in interface but DB uses `lat`/`lng` — corrected.
**Bug fixed:** `FishingRegulationsClient.tsx` had `target="_blank"` on source link — removed (CLAUDE.md rule #6).

### Sales Page (app/sales/page.tsx)
Intentional navigation hub — 6 cards linking to core sales pages. Auth-guarded. No issues.

---

## Phase 3 — DB Connectivity Audit

### Errors Found & Fixed

| Page / API | Issue | Fix |
|---|---|---|
| `/pipeline` | `job_renders` table missing | Migration: created table with RLS |
| `/payroll/employees` | `employee_pay_settings` missing 6 columns | Migration: added `salary_period`, `per_job_rate`, `percent_job_rate`, `pay_period_type`, `worker_type`, `overtime_eligible` |
| `/payroll/gusto` | `gusto_exports` table missing | Migration: created table with RLS |
| `/invoices` | Join used `sales_order_id` (wrong column, no FK) | Code fix: `so_id`; Migration: added FK `invoices.so_id → sales_orders` |
| `/payments` | Invalid join `projects(id,title)` — no `project_id` column; no FK on `invoice_id` | Code fix: removed invalid join; Migration: added FK `payments.invoice_id → invoices` |

Migration: `supabase/migrations/20260227120000_fix_missing_tables_and_columns.sql`

### RLS Status (Fishing Tables)
All 10 fishing tables have RLS enabled with appropriate policies.

---

## Phase 4 — Security & Performance Advisors

Migration: `supabase/migrations/20260227130000_security_and_performance_fixes.sql`

### Security Fixes Applied

**Function search_path (prevents search_path injection attacks):**
- `get_my_org_id` — SET search_path = public
- `sync_customers_aliases` — SET search_path = public
- `sync_sales_referrals_aliases` — SET search_path = public
- `sync_xp_ledger_aliases` — SET search_path = public

**RLS policies hardened (replaced USING(true) with org-scoped):**

| Table | Was | Fixed To |
|-------|-----|----------|
| `ai_comm_rules` | USING(true) | org_id scoped |
| `ai_message_log` | USING(true) | org_id scoped |
| `broadcast_campaigns` | USING(true) | org_id scoped |
| `inbound_emails` | USING(true) | org_id scoped |
| `installer_payroll_records` | USING(true) for authenticated | org_id scoped |
| `rate_card_settings` | USING(true) for authenticated | org_id scoped |
| `sequence_step_sends` | USING(true) | org_id scoped |
| `conversation_ai_config` | USING(true) | conversation→org scoped |
| `customer_notifications` | USING(true) | customer→org scoped |
| `customer_vehicles` | USING(true) | customer→org scoped |
| `decking_specs` | USING(true) | project→org scoped |
| `tint_specs` | USING(true) | project→org scoped |
| `user_badges` | USING(true) | same-org users scoped |

**Intentionally permissive (public-facing token flows — left unchanged):**
- `design_intake_sessions`, `onboarding_leads`, `portal_messages`, `portal_quote_approvals`, `proposal_selections`, `proposal_signatures`, `wrap_funnel_sessions`, `wrap_leads`, `wrap_tracking_events`, `shop_sessions`, `proof_settings` UPDATE

**Auth: Leaked password protection** — requires manual toggle in Supabase Auth dashboard settings.

### Performance Fixes Applied

70 indexes created on unindexed foreign key columns across high-traffic tables:
- `messages` (org_id, project_id, sender_id, conversation_id)
- `notifications` (user_id, org_id)
- `tasks` (project_id, assigned_to, created_by)
- `time_entries` (org_id, project_id, user_id, installer_id)
- `vinyl_usage` (project_id, vinyl_id, recorded_by)
- `sourcing_orders`, `sales_referrals`, `campaigns`, `proposals`
- `send_backs`, `stage_approvals`, `xp_ledger`, `user_badges`
- `fishing_regulations`, `catch_log`
- `job_renders`, `gusto_exports` (newly created tables)
- `affiliates`, `calls`, `workflows`, `media_files`, `communications`
- And more (see migration file for full list)

**Remaining unindexed FKs:** ~150 on lower-traffic tables (not blocking)

---

## Final State

| Check | Status |
|-------|--------|
| Build | PASSING — 397 pages, 0 errors |
| Nav links | 39/39 valid |
| DB connectivity (key pages) | All errors resolved |
| Security advisors | All actionable warnings fixed |
| Performance advisors | 70 indexes added on high-traffic FK columns |
