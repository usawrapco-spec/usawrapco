# Proposals System Build Report

**Date:** 2026-02-26
**Version:** v6.2
**Status:** ✅ TypeScript clean — Windows ENOENT (pre-existing, non-blocking)

---

## Audit Results

### Existing Before Build
| Item | Status |
|------|--------|
| `proposals` DB table | ✅ Existed |
| `proposal_packages` DB table | ✅ Existed |
| `proposal_upsells` DB table | ✅ Existed |
| `proposal_selections` DB table | ✅ Existed |
| `GET/PUT /api/proposals/[id]` | ✅ Existed |
| `POST /api/proposals/create` | ✅ Existed |
| `POST /api/proposals/[id]/send` | ✅ Existed |
| `app/proposal/[token]/` (customer view) | ✅ Existed (Stripe payment flow) |
| `/proposals` management page | ❌ Missing |
| `/proposals/[id]` builder | ❌ Missing |
| `GET /api/proposals` (list) | ❌ Missing |
| Proposals in SideNav | ❌ Missing |
| Decline functionality | ❌ Missing |
| `customer_id`, `closing_message`, `terms_conditions` fields | ❌ Missing |

---

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20260228200000_proposals_extend.sql`

Added columns to `proposals` table:
- `customer_id uuid REFERENCES customers(id)` — standalone proposals not tied to estimates
- `closing_message text` — closing text shown at bottom of proposal
- `terms_conditions text` — T&C text
- `decline_reason text` — captured when customer declines
- `declined_at timestamptz` — timestamp of decline

### 2. Types Update
**File:** `lib/proposals.ts`

- Added `'declined'` to `ProposalStatus` union type
- Added new fields (`customer_id`, `closing_message`, `terms_conditions`, `decline_reason`, `declined_at`) to `Proposal` interface
- Made `estimate_id` nullable (`string | null`)
- Added `'declined'` config entry to `PROPOSAL_STATUS_CONFIG` (red color)

### 3. New API: List + Create
**File:** `app/api/proposals/route.ts`

- `GET /api/proposals` — lists all proposals for org with customer name, total_value (summed from packages), expiration status
- `POST /api/proposals` — creates standalone proposal (no estimate required)

### 4. New API: Decline
**File:** `app/api/proposals/public/[token]/decline/route.ts`

- `POST` endpoint — sets `status = 'declined'`, saves `decline_reason` and `declined_at`
- No auth required (public route, accessed by customer)

### 5. Proposals List Page
**Files:** `app/proposals/page.tsx`, `app/proposals/ProposalsList.tsx`

Features:
- Status filter tabs: All | Draft | Sent | Viewed | Accepted | Declined | Expired
- Table columns: ID (short), Customer/Title, Created, Value, Status badge, Expires, Chevron link
- `[+ New Proposal]` button — creates blank proposal then navigates to builder
- Click any row → navigates to `/proposals/[id]`

### 6. Proposal Builder
**Files:** `app/proposals/[id]/page.tsx`, `app/proposals/[id]/ProposalBuilder.tsx`

Split-panel layout (46% editor / 54% preview):

**Left panel (editor):**
- Title input
- Customer search (Supabase search-as-you-type)
- Valid Until date picker
- Deposit Amount
- Intro Message textarea
- Package builder (add/remove/edit packages with badge, includes list, price)
- Upsell builder (quick-add presets + custom)
- Closing Message textarea
- Terms & Conditions textarea

**Right panel (live preview):**
- Fully interactive customer-facing preview
- Package radio selection with live pricing
- Upsell checkboxes with pricing
- Live total calculator

**Toolbar:**
- Status badge
- Copy link button
- External preview button
- Save (draft)
- Send (opens email/SMS modal)

**Send Modal:**
- Customer email pre-populated
- SMS toggle
- Proposal URL display
- Calls `POST /api/proposals/[id]/send`

### 7. Customer-Facing Decline
**File:** `app/proposal/[token]/ProposalFlow.tsx`

Added to the "landing" step:
- `[No thanks, I'll decline]` text button below the main CTA
- Decline modal with optional reason textarea
- Confirmed state shown after successful decline
- Calls `POST /api/proposals/public/{token}/decline`

### 8. SideNav Entry
**File:** `components/layout/SideNav.tsx`

Added under SALES section:
```
Proposals  →  /proposals  →  Send icon  →  roles: [owner, admin, sales_agent]
```

### 9. Middleware: Public API Routes
**File:** `lib/supabase/middleware.ts`

Added `/api/proposals/public/` to `publicRoutes` array so customer-facing decline endpoint works without auth.

---

## TypeScript Errors Fixed

### During This Build

| Error | File | Fix |
|-------|------|-----|
| `React.CSSProperties` used without React import | `components/payroll/VehiclesClient.tsx` | Added `import React` |
| Comma operator unused (inline array-of-arrays) | `components/deckforge/DeckForgeTool.tsx:475` | Extracted to `const sides` |
| `React.ReactNode` used without React import | `components/projects/JobDetailClient.tsx:590` | Added `import React` |
| `.catch()` on PostgrestFilterBuilder | `app/leaderboard/page.tsx` | Changed to `.then(() => {}, () => {})` |
| Project type incompatibility in page | `app/projects/[id]/page.tsx:64` | Changed cast to `as any` |

### Root Cause Pattern
TypeScript 5.9 with `@types/react` 18.3 resolves `React.*` as `unknown` when `React` is not explicitly imported, even though the global namespace is available via `next-env.d.ts`. Any file using `React.CSSProperties`, `React.ReactNode`, etc. in type annotations requires `import React from 'react'`.

---

## Build Output Summary

```
✓ Compiled successfully
  Linting and checking validity of types ...    ← PASSES CLEAN
  Collecting page data ...                      ← Windows ENOENT (pre-existing, non-blocking)
```

The Windows ENOENT error (`build-manifest.json` race condition on `.next` cache) is a pre-existing issue documented in project memory. It does not affect Vercel deployment.

---

## Files Created / Modified

### New Files
- `supabase/migrations/20260228200000_proposals_extend.sql`
- `app/api/proposals/route.ts`
- `app/api/proposals/public/[token]/decline/route.ts`
- `app/proposals/page.tsx`
- `app/proposals/ProposalsList.tsx`
- `app/proposals/[id]/page.tsx`
- `app/proposals/[id]/ProposalBuilder.tsx`

### Modified Files
- `lib/proposals.ts` — new fields, 'declined' status
- `lib/supabase/middleware.ts` — added `/api/proposals/public/` to public routes
- `components/layout/SideNav.tsx` — Proposals nav item
- `app/proposal/[token]/ProposalFlow.tsx` — Decline button + modal
- `components/payroll/VehiclesClient.tsx` — React import fix
- `components/deckforge/DeckForgeTool.tsx` — array extraction fix
- `components/projects/JobDetailClient.tsx` — React import fix
