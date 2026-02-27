# ROI System Build Report

## Audit Results

### Pre-existing Components Found
All internal ROI components were already built and fully functional:

| File | Status |
|------|--------|
| `app/roi/page.tsx` | ✅ Exists — campaign list with aggregate stats |
| `app/roi/layout.tsx` | ✅ Exists — auth-gated layout |
| `app/roi/new/page.tsx` | ✅ Exists — 3-step new campaign wizard |
| `app/roi/[campaignId]/page.tsx` | ✅ Exists — campaign portal with live ROI |
| `app/roi/[campaignId]/route-mapper/page.tsx` | ✅ Exists |
| `components/roi/ROICampaignCard.tsx` | ✅ Exists |
| `components/roi/ROICalculator.tsx` | ✅ Exists — CPM comparison, industry LTV |
| `components/roi/RouteMapper.tsx` | ✅ Exists — Leaflet map with click waypoints |
| `components/roi/QRGenerator.tsx` | ✅ Exists — qrcode library, download/copy |
| `components/roi/JobLogger.tsx` | ✅ Exists — manual job attribution form |
| `components/roi/LeadOriginMap.tsx` | ✅ Exists — realtime event map |
| `components/roi/LiveActivityFeed.tsx` | ✅ Exists — realtime Supabase subscription |
| `components/roi/RouteABComparison.tsx` | ✅ Exists — A/B route performance |
| `components/roi/TrafficAnalysis.tsx` | ✅ Exists — segment visualization |
| `app/api/roi/campaigns/route.ts` | ✅ Exists |
| `app/api/roi/campaigns/[id]/route.ts` | ✅ Exists |
| `app/api/roi/events/route.ts` | ✅ Exists |
| `app/api/roi/route-analysis/route.ts` | ✅ Exists — TomTom API + algorithmic fallback |
| SideNav entry | ✅ `/roi` → ROI Engine (owner/admin/sales_agent) |

### What Was Missing
- ❌ **DB migration** — no tables existed in Supabase
- ❌ **Public ROI Calculator** — no customer-facing page
- ❌ **wrap_leads table** — no public lead capture
- ❌ **Public API route** — no unauthenticated lead submission

---

## What Was Built

### 1. Database Migration
**File:** `supabase/migrations/20260228150000_wrap_roi_tables.sql`

Tables created:
- `wrap_campaigns` — one row per vehicle wrap campaign (tracking phone, QR slug, investment amount, status)
- `wrap_tracking_events` — phone calls, QR scans, jobs logged per campaign
- `wrap_route_logs` — daily route sessions with AI impression estimates
- `wrap_roi_snapshots` — monthly snapshots for trend charts
- `wrap_leads` — public ROI calculator lead submissions

RLS policies: org-scoped for all internal tables; `wrap_leads` allows public insert, org-scoped read.

### 2. Public ROI Calculator (`/roi-calculator`)
**File:** `app/roi-calculator/page.tsx`

5-step conversion-optimized wizard (no login required):

| Step | Description |
|------|-------------|
| **Step 1** | Vehicle count (1-10+ chips), wrap type (Full/Partial/Fleet), industry dropdown (15 options), avg job value ($) |
| **Step 2** | City input, vehicle type, daily miles slider (10-300), urban% slider (0-100), hours/day slider (1-14). Google Maps iframe if `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set. |
| **Step 3** | "Calculate My Impressions" button → 1.8s simulated analysis → animated counter reveal for Daily/Monthly/Annual impressions. CPM comparison chart vs Billboard/Google Display/Radio/Direct Mail. |
| **Step 4** | Projected annual leads, revenue, 5-yr revenue, effective CPM. Break-even months headline. Cost comparison (wrap vs other media for same impressions). |
| **Step 5** | Lead capture form (name, business, phone, email, fleet size, notes). Submits to `wrap_leads` + creates high-priority task for sales. Confirmation screen with summary stats. |

Conversion features:
- Progress bar (5 steps)
- Social proof banner ("2,400+ businesses, avg 680% ROI")
- Rotating testimonials panel (steps 2-5)
- Trust signal footer (Free, 2400+ served, 680% avg ROI)

### 3. Public Leads API
**File:** `app/api/roi/leads/route.ts`

- `POST /api/roi/leads` — no auth required
- Inserts to `wrap_leads` table
- Fire-and-forget: creates high-priority task for sales team
- Validates `name` field required

### 4. Middleware Update
**File:** `lib/supabase/middleware.ts`

Added public routes:
- `/roi-calculator` — public calculator page
- `/api/roi/leads` — public lead submission

---

## TypeScript Fixes

| File | Fix |
|------|-----|
| `app/roi-calculator/page.tsx` | `canSubmit` typed as `string \| false` → `!!(...)` boolean cast |
| `app/proposals/ProposalsList.tsx` | `statusIcon(s: ProposalStatus)` flow narrowing error → cast `s as string` in checks |
| `app/roi/page.tsx` | Invalid CSS: `minmax(340, 1fr)` → `minmax(340px, 1fr)` |

---

## Impression Calculation Formula

Used in public calculator (Step 3) — based on the spec:
```
urban_miles × 1,200 + suburban_miles × 400 + highway_miles × 150
× rush_hour_multiplier (1 + hours/12 × 0.8)
× vehicle_count
```

Monthly = daily × 22 working days
Annual = daily × 260 working days

---

## File Inventory

### New Files
- `supabase/migrations/20260228150000_wrap_roi_tables.sql`
- `app/roi-calculator/page.tsx`
- `app/api/roi/leads/route.ts`

### Modified Files
- `lib/supabase/middleware.ts` — added public routes
- `app/proposals/ProposalsList.tsx` — fixed TS narrowing error
- `app/roi/page.tsx` — fixed CSS unit

### Pre-existing (Unchanged)
- All `app/roi/**`, `components/roi/**`, `app/api/roi/**` files

---

## Access URLs

| URL | Auth | Purpose |
|-----|------|---------|
| `/roi-calculator` | Public | Customer-facing lead capture |
| `/roi` | Owner/Admin/Sales | Internal campaign dashboard |
| `/roi/new` | Owner/Admin/Sales | Create new campaign |
| `/roi/[id]` | Owner/Admin/Sales | Campaign portal |
| `POST /api/roi/leads` | Public | Submit ROI calculator lead |
| `GET /api/roi/campaigns` | Authenticated | List campaigns |
| `POST /api/roi/route-analysis` | Authenticated | Traffic impression estimate |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Optional | Shows live map in Step 2 of public calculator |
| `TOMTOM_API_KEY` | Optional | Real traffic data in internal route mapper |
