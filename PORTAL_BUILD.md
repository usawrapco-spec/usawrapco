# PORTAL_BUILD.md — Customer Portal v6.2

**Date:** 2026-02-28
**Status:** Build passes (webpack ✓, TypeScript ✓ via tsc --noEmit)

---

## AUDIT RESULTS

| Check | Result |
|-------|--------|
| Customer-facing routes outside auth | `/portal/`, `/proposal/`, `/intake/`, `/signoff/`, `/proof/`, `/track/` — all properly public in middleware |
| `/book` page exists | ✓ at `app/book/page.tsx` |
| Proposals public view | ✓ at `/proposal/[token]` — uses `sales_orders.portal_token` |
| `customer_vehicles` table | ✓ exists — used by CustomerPortalHome |
| `customer_notifications` table | ✓ exists — used by CustomerPortalHome |
| `condition_reports` table | ✓ exists |
| `portal_token` on projects | ✓ Added via migration (auto-UUID, unique) |

---

## WHAT WAS BUILT

### 1. Database Migration
**File:** `supabase/migrations/20260228200000_portal_token_projects.sql`
**Applied:** Yes (live on production)

- `ALTER TABLE projects ADD COLUMN IF NOT EXISTS portal_token uuid DEFAULT gen_random_uuid() UNIQUE`
- Back-fills all existing rows with unique UUIDs
- Creates `portal_messages` table — customer↔team messaging via portal (public RLS)
- Creates `portal_quote_approvals` table — records quote approvals (public RLS)
- Creates index `idx_projects_portal_token` for fast lookups

### 2. Portal Route — `/portal/[token]`
**File:** `app/portal/[token]/page.tsx` (updated — server component)

**Routing logic:**
1. Tries to find `token` in `projects.portal_token` (admin client query)
2. If found → renders new `ProjectPortalClient` with full project data
3. If not found → falls back to existing `CustomerPortalHome` (intake token portal)

**Data loaded in parallel:**
- Customer info, estimate + line items, design proofs, job photos, invoice, portal messages

### 3. ProjectPortalClient Component
**File:** `components/portal/ProjectPortalClient.tsx` (NEW)

Focused single-project portal with these sections:

| Section | Details |
|---------|---------|
| **Header** | USA Wrap Co logo + phone number |
| **Progress Tracker** | 7-stage visual pipeline: Estimate → Approved → Design → Proof Review → Print → Install → Complete |
| **Job Summary** | Service, install date, customer contact |
| **Quote/Estimate** | Line items, totals, Approve Quote + Request Changes (saves to `portal_quote_approvals`, notifies team) |
| **Design Proofs** | Proof images with lightbox zoom, Approve + Request Revision per proof (updates `design_proofs.customer_status`) |
| **Photos** | Before/After/In-Progress grid with lightbox |
| **Appointment** | Install date, location, Add to Google Calendar link |
| **Messages** | Threaded chat persisted to `portal_messages` table |
| **Invoice/Payment** | Total, paid, balance, payment contact info |

All sections are collapsible. Sections only render when data exists.

### 4. Quote Action API
**File:** `app/api/portal/quote-action/route.ts` (NEW)
**Route:** `POST /api/portal/quote-action` — public (no auth, token-verified)

- Verifies `portal_token` matches `project_id` before accepting action
- Saves to `portal_quote_approvals` table
- Writes internal `job_comments` entry (team notification)
- Creates `notifications` entry for approved quotes
- Added to middleware public routes

### 5. Send Portal Link API
**File:** `app/api/portal/send-link/route.ts` (NEW)
**Route:** `POST /api/portal/send-link` — authenticated (team use only)

- Sends branded HTML email via Resend to customer's email
- Includes job title, vehicle, install date, portal URL
- Logs to `activity_log`
- Returns `{ ok: true, email }` or descriptive error

### 6. ProjectDetail.tsx Updates
**File:** `components/projects/ProjectDetail.tsx` (updated)

- `portalToken` state initializes from `initial.portal_token` (project column)
- Falls back to DB lookup if not hydrated
- **Share Portal** button: copies `/portal/[portal_token]` to clipboard
- **Email Portal** button: calls `/api/portal/send-link`, shows "Sent!" confirmation
- Added `Mail` Lucide icon import

### 7. Type & Bug Fixes

**`types/index.ts`** — Added `portal_token?: string | null` to `Project` interface

**`components/projects/JobDetailClient.tsx`** — Fixed pre-existing TS errors:
- `!!fd.vehicleColor` → `fd.vehicleColor != null` (unknown not assignable to ReactNode in strict JSX)
- `!!fd.jobType` → `fd.jobType != null`

---

## PORTAL ACCESS FLOW

```
Team in ProjectDetail → "Share Portal" → copies link to clipboard
                      → "Email Portal" → sends Resend email to customer

Customer receives: https://app.usawrapco.com/portal/[UUID]
  → ProjectPortalClient loads
  → Can approve quote, approve/revision proofs, send messages
  → Actions persist to DB, team gets notified
```

---

## BACKWARD COMPATIBILITY

- `/portal/[intake_token]` — still works, falls back to `CustomerPortalHome`
- `/portal/quote/[token]` — unchanged, uses `sales_orders.portal_token`
- All existing intake tokens continue working

---

## FILES CHANGED

| File | Action |
|------|--------|
| `supabase/migrations/20260228200000_portal_token_projects.sql` | NEW |
| `app/portal/[token]/page.tsx` | UPDATED |
| `components/portal/ProjectPortalClient.tsx` | NEW |
| `app/api/portal/quote-action/route.ts` | NEW |
| `app/api/portal/send-link/route.ts` | NEW |
| `components/projects/ProjectDetail.tsx` | UPDATED |
| `types/index.ts` | UPDATED |
| `lib/supabase/middleware.ts` | UPDATED |
| `components/projects/JobDetailClient.tsx` | FIXED |
