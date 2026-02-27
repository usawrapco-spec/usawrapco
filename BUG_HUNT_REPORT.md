# USA Wrap Co — Full App Audit & Bug Hunt Report

**Date:** 2026-03-02
**Version:** v6.2

---

## STEP 1 — BUILD AUDIT

### next.config.js Warning Fixed
- **Issue:** `outputFileTracingIncludes` was at the top level of `next.config.js`, causing Next.js to warn: `Unrecognized key(s) in object: 'outputFileTracingIncludes'`
- **Fix:** Moved `outputFileTracingIncludes` inside `experimental` block alongside `serverComponentsExternalPackages`

### TypeScript Errors Fixed

**1. `components/deckforge/DeckForgeTool.tsx:475`**
- **Issue:** TypeScript error TS2695 "Left side of comma operator is unused" on a nested array literal `[[x,y,x+width,y],[...]]` used in `.forEach()`. Also TS2448 "Block-scoped variable used before its declaration."
- **Fix:** Added explicit type cast: `([ ... ] as [number,number,number,number][])`

**2. `components/deckforge/ThreeViewport.tsx`**
- **Issue:** TS2503 "Cannot find namespace 'THREE'" — `THREE` was imported dynamically inside an `async` function but used as a type namespace in function signatures.
- **Fix:** Added `import type * as THREE from 'three'` at the top of the file for type-only namespace resolution.

**3. `components/projects/JobDetailClient.tsx`**
- **Issue:** TS2322 "Type 'unknown' is not assignable to type 'ReactNode'" — `fd` was typed as `Record<string, unknown>` both in the `const fd` definition and the `OverviewTabProps` interface. React 18 strict ReactNode types don't accept `unknown`.
- **Fix:** Changed both occurrences to `Record<string, any>`.

### Windows Build Note
The `build-manifest.json` ENOENT error during "Collecting page data" is a pre-existing Windows file system race condition (documented in MEMORY.md). TypeScript compilation and type-checking pass cleanly. Vercel deployment builds on Linux where this doesn't occur.

---

## STEP 2 — BROKEN ROUTES AUDIT

All sidebar navigation routes verified to have corresponding page files:

| Route | Page File | Status |
|-------|-----------|--------|
| All 60+ sidebar routes | app/*/page.tsx | ✓ All exist |

No missing pages found. Every route in `SideNav.tsx` maps to an existing `page.tsx`.

---

## STEP 3 — DATABASE AUDIT

### Missing Tables Fixed (Runtime Errors)

**1. `custom_vehicles`** — Used in `components/catalog/CatalogPage.tsx` for org-specific vehicle presets.
- **Migration:** `20260302120000_missing_catalog_tables.sql`
- **Columns:** id, org_id, year, make, model, vehicle_type, total_sqft, base_price, default_hours, default_pay, created_at
- **RLS:** Org-member read/write policy applied

**2. `custom_line_items`** — Used in `components/catalog/CatalogPage.tsx` for org-specific line item presets.
- **Migration:** Same as above
- **Columns:** id, org_id, name, description, default_price, category, created_at
- **RLS:** Org-member read/write policy applied

**3. `job_expenses`** — Used in `components/projects/JobExpenses.tsx` and `app/api/agents/chat/route.ts`.
- **Migration:** Same as above
- **Columns:** id, org_id, project_id, created_by, category, description, amount, billable, created_at
- **RLS:** Org-member read/write policy applied

### Tables Confirmed Existing
- `appointments` (used in schedule/page.tsx) ✓
- `booking_settings` (used in settings/booking/page.tsx) ✓
- `sms_conversations`, `sms_messages`, `call_logs`, `app_settings` (TwilioSmsHub) ✓
- `notifications` (used in many API routes) ✓
- `vehicle_measurements` (used in VehicleMeasurementPicker) ✓

### DB Patterns Verified
- All `sms_*` and `call_logs` tables in TwilioSmsHub have correct schema references
- All API routes for Twilio webhooks (`call-status`, `inbound-sms`) use correct tables
- New `booking_settings` page correctly queries the existing `booking_settings` table

---

## STEP 4 — AUTH & RLS AUDIT

### Public Routes in Middleware
All middleware public routes verified in `lib/supabase/middleware.ts`:
- `/login`, `/auth/callback`, `/intake/`, `/proof/`, `/signoff/`, `/track/`, `/ref/`, `/portal/`, `/shop`, `/brand/`, `/proposal/`, `/get-started`, `/start`, `/design-intake/`, `/api/*`, `/pay/`, `/configure/`, `/presentation/`, `/condition-report/`, `/book`, `/api/appointments/public`

### Auth Pattern
Every authenticated page uses the standard pattern:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

### org_id Filtering
All admin queries verified to filter by `org_id`. The `booking_settings` page correctly filters by `orgId` from profile.

---

## STEP 5 — MOBILE AUDIT

Mobile review of key pages:
- All pages use `paddingBottom: 80` for mobile nav clearance
- MobileNav renders conditionally: `<div className="md:hidden"><MobileNav /></div>`
- TopNav provides mobile hamburger menu
- All modals and drawers checked — use `overflow: auto` with proper height constraints
- Tables on smaller pages use horizontal scroll where needed

No critical mobile overflow issues found.

---

## STEP 6 — EMPTY STATES

Reviewed key pages for empty state handling:
- **Estimates** `/estimates` — ✓ Shows "No estimates found" with CTA
- **Customers** `/customers` — ✓ Shows icon + message when empty
- **Tasks** `/tasks` — ✓ Shows "No tasks" message
- **Inventory** `/inventory` — ✓ Has loading + empty state
- **Calendar** `/calendar` — ✓ Handles empty day
- **Schedule** `/schedule` — ✓ "No appointments scheduled" fallback

All `.map()` calls verified to have fallback `|| []` from server-side queries.

---

## STEP 7 — LOADING STATES

Most pages use server-side rendering (SSR) so loading states are handled by Next.js.
- Client components with `useEffect` fetches (Inventory, TwilioSmsHub) have explicit `loading` state variables
- Server pages pass `|| []` defaults so children never receive undefined

---

## STEP 8 — ERROR BOUNDARIES

All API routes and server actions use try/catch with `console.error` for actual errors.
Key examples verified:
- `/api/twilio/call-status` — try/catch, returns 200 on error
- `/api/twilio/inbound-sms` — try/catch, returns TwiML on error
- All new migration tables handle missing data gracefully (UPSERT/IF NOT EXISTS patterns)

---

## STEP 9 — CONSOLE CLEANUP

Removed all `console.log` debug statements:

### Components
- `components/estimates/EstimateDetailClient.tsx:4621` — removed `console.log('[toast]', msg)` from fallback `showToast`
- `components/jobs/JobDetailTabs.tsx:1200` — removed `console.log('Activity note added:', note)`
- `components/network/NetworkMapEnhanced.tsx:84` — removed `console.log('Rendering network graph...')`

### API Routes (25 statements removed)
- `app/api/ai/auto-respond/route.ts`
- `app/api/ai-broker/inbound/route.ts`
- `app/api/ai-broker/send-quote/route.ts`
- `app/api/comms/call/initiate/route.ts`
- `app/api/comms/call/webhook/route.ts`
- `app/api/comms/email/send/route.ts`
- `app/api/comms/sms/send/route.ts`
- `app/api/comms/sms/webhook/route.ts`
- `app/api/deposit/checkout/route.ts`
- `app/api/email/resend-webhook/route.ts`
- `app/api/email/send/route.ts`
- `app/api/inbox/inbound-email/route.ts`
- `app/api/inbox/send/route.ts`
- `app/api/payments/webhook/route.ts`
- `app/api/proposals/[id]/send/route.ts`
- `app/api/webhooks/twilio/route.ts`
- `lib/services/ai-pipeline.ts`

All `console.error` statements retained for real error reporting.

---

## STEP 10 — FINAL BUILD

**TypeScript:** ✓ Passes (0 TypeScript errors)
**Webpack Compilation:** ✓ Compiled successfully
**Windows ENOENT:** Pre-existing Windows build race condition (non-blocking for Vercel)

---

## Summary of All Changes

| File | Change |
|------|--------|
| `next.config.js` | Moved `outputFileTracingIncludes` into `experimental` |
| `components/deckforge/DeckForgeTool.tsx` | Fixed TS tuple type cast |
| `components/deckforge/ThreeViewport.tsx` | Added `import type * as THREE from 'three'` |
| `components/projects/JobDetailClient.tsx` | Changed `Record<string,unknown>` → `Record<string,any>` |
| `components/estimates/EstimateDetailClient.tsx` | Removed console.log |
| `components/jobs/JobDetailTabs.tsx` | Removed console.log |
| `components/network/NetworkMapEnhanced.tsx` | Removed console.log |
| 17 API route files | Removed all console.log statements |
| `supabase/migrations/20260302120000_missing_catalog_tables.sql` | Created custom_vehicles, custom_line_items, job_expenses tables |
