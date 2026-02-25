# AI-Powered Onboarding System — Codebase Audit
**Date:** 2026-02-24
**Auditor:** Claude Code
**Purpose:** Cross-reference spec against existing codebase before building. Read-only audit.

---

## EXECUTIVE SUMMARY

The codebase is 60–70% of the way to the spec. The core Stripe payment flow, Anthropic integration, Fabric.js canvas, and customer intake form all exist in some form. The **primary gaps** are: (1) no payment gate inside the intake portal flow, (2) the existing design canvas is staff-only (requires auth), and (3) the spec's DB tables (`design_submissions`, `mockups`, `pricing`) don't exist — the codebase uses `customer_intake` + `design_projects` instead. **Do not build the spec's tables** — map onto existing ones.

---

## SECTION 1 — ALREADY EXISTS (Do Not Rebuild)

### 1.1 Customer Intake Form (`/intake/[token]`)
**File:** `components/customer/CustomerIntakePortal.tsx`
**Status:** FULLY BUILT — exceeds spec requirements

The intake form already collects:
- Business branding (website URL + auto-scrape via `/api/scrape-brand`)
- Logo upload → `project-files` storage bucket
- Brand colors (auto-extracted from website scrape + manual entry)
- Inspiration photos / "no-go" photos (likes/dislikes)
- Vehicle info with VIN lookup (NHTSA auto-decode)
- Vehicle photos (all 4 sides with camera capture)
- Damage photos
- Wrap type + area selection
- Design brief + text content
- Existing wrap / removal flag

On submit: saves to `customer_intake` table, awards XP, and **auto-triggers** `/api/brand-portfolio/generate-from-intake` which runs AI brand analysis and creates a `brand_portfolios` record.

**Spec gap vs existing:** Spec's multi-step form is a subset of what already exists. No rebuild needed.

---

### 1.2 Brand Analysis API
**Files:**
- `app/api/ai/analyze-brand/route.ts` — direct Anthropic vision call (supports base64 + URL modes)
- `app/api/analyze-brand/route.ts` — orchestrator calling `runPipeline('brand_analysis', ...)`
- `app/api/brand-portfolio/generate-from-intake/route.ts` — full pipeline: reads intake → runs analysis → creates brand_portfolio record

**What it does:**
- Accepts logo as base64 (new interface) or image URLs (old interface)
- Calls Anthropic with vision content blocks
- Returns: colors, style, complexityScore, suggestedApproach, fontSuggestions, brandPersonality, wrapNotes
- Saves analysis to `brand_portfolios.ai_brand_analysis`

**Spec difference:** Spec uses `claude-opus-4-6` with adaptive thinking. Existing `/api/ai/analyze-brand` uses `claude-sonnet-4-6` without thinking. The `/api/analyze-brand` pipeline route delegates to whichever model is configured in `ai_pipeline_config` DB table.

---

### 1.3 Pricing API
**File:** `app/api/ai/calculate-pricing/route.ts`
**Model:** `claude-opus-4-6` ✓

Accepts: vehicleType, wrapType, sqft, panels, material, division
Returns: material_cost, install_labor_cost, design_fee, total_sale, net_profit, gross_profit_margin, agent_commission

**Spec difference:** Spec's pricing rules use a customer-facing simplified model (base $800 van, coverage multiplier, rush fee, tax). Existing uses internal B2B rates (sqft × material rate, labor hours, GPM%). These serve different purposes — the existing one is for staff quoting, not customer self-service. A new customer-facing wrapper is needed (see Section 3).

---

### 1.4 Design Feedback API
**File:** `app/api/ai/design-feedback/route.ts`
**Model:** `claude-opus-4-6` ✓

Returns: production_ready, overall_score, issues (severity/category/issue/fix), approvals, summary

**Spec difference:** Existing version is production/staff-facing (checks bleed, DPI, CMYK, font outlines). Spec's version is customer-facing (checks readability at 50ft, contrast, legal concerns). Different prompt, same endpoint path — will need a separate customer-facing variant.

---

### 1.5 Mockup Generation API
**File:** `app/api/generate-mockup/route.ts`
**Provider:** Replicate (flux-1.1-pro-ultra, flux-dev via ai-pipeline)

Accepts: prompt, vehicle_type, style, colors, brief, projectId
Uses `runPipeline('concept_generation', ...)` → Replicate → returns image URLs
Requires auth (staff only currently)

**Spec difference:** Spec version (1) uses Claude to craft the image prompt from canvas JSON, (2) saves to a `mockups` table, (3) is triggered by customer. Existing skips the Claude-prompt step (takes direct prompt), saves URLs to `design_projects`, and requires auth. Core Replicate infrastructure is shared.

---

### 1.6 Stripe Payment — Checkout Creation ($250)
**Files:**
- `app/api/payments/create-checkout/route.ts` — **primary** — creates $250 checkout, metadata: `{intake_token, project_id}`, success URL: `/intake/${intakeToken}?payment=success`
- `app/api/onboarding/deposit/route.ts` — **secondary** — same amount, different metadata/redirects, used by `/onboard/[token]` flow
- `app/api/onboarding/create-checkout/route.ts` — older version targeting `onboarding_leads` table

**Spec match:** `create-checkout/route.ts` is essentially spec-identical. $250, correct metadata, correct redirect URLs. ✓

---

### 1.7 Stripe Webhook — Payment Completion
**Files:**
- `app/api/payments/webhook/route.ts` — updates `customer_intake.payment_status = 'paid'`, awards XP, handles invoice payments
- `app/api/webhooks/stripe/route.ts` — also handles `customer_intake.payment_status`, plus invoice.paid and payment_intent events

Both correctly update `customer_intake` on payment completion. **Conflict warning:** Two webhook handlers exist. Only one should be registered in the Stripe dashboard. See Section 4.

---

### 1.8 Design Canvas — Internal/Staff
**File:** `components/design/DesignCanvasClient.tsx` (1867 lines)
**Route:** `app/design/[id]/page.tsx`

Full Fabric.js canvas with:
- Drawing tools: select, draw, arrow, rect, circle, text, image, measure, eyedropper
- 11 vehicle type templates with sqft panel data (Pickup, SUV, Sedan, Cargo Van, Sprinter, Box Truck, Semi Trailer, etc.)
- Layers panel, coverage calculator, print specs panel
- File upload (drag-drop + fileInput)
- Autosave every 30s + Ctrl+S to `design_projects.canvas_data`
- Comments/history tab
- AI mockup generation button (calls `/api/generate-mockup`)
- Print-ready checklist

**Spec difference:** This canvas requires auth — it's for designers. Spec requires a **customer-accessible** canvas at a public URL (after $250 payment). These should remain separate pages.

---

### 1.9 Anthropic API Infrastructure
- `ANTHROPIC_API_KEY` env var — used across 15+ routes
- `@anthropic-ai/sdk` — installed (`package.json`)
- `lib/services/ai-pipeline.ts` — model registry with Opus/Sonnet/image-gen models, cost tracking, fallback logic
- Multiple routes using `claude-opus-4-6` already: design-feedback, calculate-pricing, daily-briefing, work-summary, etc.

---

### 1.10 Replicate Infrastructure
- `REPLICATE_API_TOKEN` env var supported
- `lib/services/ai-pipeline.ts` MODEL_REGISTRY contains: flux-1.1-pro-ultra, flux-1.1-pro, flux-dev, flux-schnell, ideogram-v2, recraft-v3, clarity-upscaler, controlnet-depth
- `/api/generate-mockup` already polls Replicate for completion

---

### 1.11 Supabase Storage
- **Active bucket:** `project-files` (public, 50 MB limit) — all uploads go here
- Pattern: `intake/{project_id}/{filename}`
- Logos, vehicle photos, brand materials all upload to this bucket
- **No `mockups` bucket** — mockup images currently saved as URLs in `design_projects`

---

### 1.12 `customer_intake` Table (existing, used instead of spec's `design_submissions`)
Columns confirmed from code:
- `id`, `org_id`, `project_id`, `token`
- `customer_name`, `customer_email`, `customer_phone`
- `vehicle_year/make/model/color/vin/trim/condition`
- `vehicle_photos`, `logo_files`, `damage_photos` (JSONB)
- `brand_colors`, `brand_fonts`, `design_brief`, `text_content`
- `wrap_areas`, `wrap_type`, `removal_required`
- `branding_meta` (JSONB — scraped data, business/inspiration/nogo photos)
- `completed`, `completed_at`
- `payment_status`, `payment_amount`, `stripe_session_id` (added via later migrations/webhooks)
- `expires_at`, `created_at`, `updated_at`

**Note:** The sprint2b SQL that created this table does NOT include `payment_status`, `payment_amount`, or `stripe_session_id`. These are referenced in code but may not be in the actual DB schema. A migration may be needed.

---

### 1.13 `brand_portfolios` Table
**File:** `sql/brand_portfolios.sql`
Stores: company_name, website_url, logo_url, brand_colors (JSONB), typography, tagline, phone, email, services, social_links, about_text, scraped_images, ai_brand_analysis, ai_recommendations, logo_variations, status, customer_edits

This is the spec's "design_submissions + AI recommendations" result, minus canvas data.

---

## SECTION 2 — PARTIALLY EXISTS (Extend, Do Not Overwrite)

### 2.1 Payment Gate in Intake Flow
**Current state:** `customer_intake.payment_status` field exists in code (webhook sets it to `'paid'`), but the `CustomerIntakePortal` component does NOT read `payment_status` or show a payment CTA. The form lets anyone submit without paying.

**What's needed:** Read `intake.payment_status` from DB on load. If `unpaid`, show a "Pay $250 to unlock design canvas" button that calls `/api/payments/create-checkout`. On return from Stripe (`?payment=success` in URL), show confirmation and link to customer canvas.

**Touch points:**
- `CustomerIntakePortal.tsx` — add payment_status to loaded state, add payment CTA section
- `customer_intake` table — confirm `payment_status` column exists (migration needed if not)

---

### 2.2 Post-Submit AI Brand Analysis Display
**Current state:** After intake submit, `/api/brand-portfolio/generate-from-intake` is called in the background (fire-and-forget). The customer sees "Thank You!" but never sees the AI analysis results.

**What's needed:** After submit, poll or await the brand portfolio creation, then display the AI analysis (colors, style, complexity score, wrap recommendation) to the customer as their "brand brief" — a value-add before asking them to pay.

**Touch points:**
- `CustomerIntakePortal.tsx` — show analysis results in the submitted state screen
- `/api/brand-portfolio/generate-from-intake` — already returns `{portfolio_id, portfolio}` but response is `.catch(()=>{})` ignored

---

### 2.3 Generate-Mockup Route (Customer Access)
**Current state:** `/api/generate-mockup/route.ts` requires auth (checks `user` via Supabase). It's designed for staff.

**What's needed:** Either (a) add an unauthed variant that validates by `intake_token` instead of session, or (b) create a new `/api/intake/generate-mockup` route that accepts `intake_token` and verifies `payment_status = 'paid'`.

The Replicate + Claude prompt-generation pattern is fully built — just needs intake-token authentication bypass.

---

### 2.4 Design Feedback for Customer Canvas
**Current state:** `/api/ai/design-feedback/route.ts` exists with Opus 4.6 but is production-staff-focused (checks DPI, CMYK, bleed). No auth check actually — the route doesn't call `supabase.auth.getUser()`, so it's effectively public.

**What's needed:** New system prompt targeting customer design concerns (text readability at 50ft, color contrast, element sizing, legal/safety flags). The route can be reused — just need a different prompt path or a query param like `?mode=customer`.

---

### 2.5 Fabric.js Canvas — Customer-Facing Version
**Current state:** `DesignCanvasClient` is a full professional design studio, staff-only, requiring a `design_projects` DB record and auth.

**What's needed:** A simplified customer-facing canvas at `/intake/[token]/design` or `/canvas/[token]` that:
- Is accessible without auth (verified by intake token + payment_status = 'paid')
- Has a simpler tool set (text, image upload, color picker — not full design studio)
- Saves canvas JSON to `customer_intake.design_canvas_data` (new column) or to `design_projects` linked to the intake's project_id
- Shows real-time AI feedback in sidebar
- Has "Submit My Design" button that saves + notifies staff

The `DesignCanvasClient` can serve as the technical reference for Fabric.js initialization, vehicle template overlays, and autosave — but the customer canvas should be a new, simpler component.

---

### 2.6 Webhook Deduplication
**Current state:** Two Stripe webhook handlers exist:
- `/api/payments/webhook` — registered in Stripe? Handles intake + invoice payments + XP
- `/api/webhooks/stripe` — handles intake + invoice.paid + payment_intent events

Both update `customer_intake.payment_status`. This will cause double-updates if both are registered.

**What's needed:** Decide which is canonical. `/api/payments/webhook` is more complete (has XP award). Consolidate or ensure only one is registered in Stripe.

---

## SECTION 3 — MISSING ENTIRELY (Build From Scratch)

### 3.1 Payment Gate UI in Intake Portal
The `CustomerIntakePortal` has no UI for payment. The spec's "$250 to unlock design canvas" CTA does not exist anywhere in the intake flow. Need to:
- Detect `payment_status` from intake record
- Show pricing info and payment button (calls existing `/api/payments/create-checkout`)
- Handle `?payment=success` return from Stripe
- Gate the canvas link behind payment

**Complexity:** LOW — the backend is all there; it's a UI addition to an existing component.

---

### 3.2 Customer-Facing Pricing Display
**Spec:** Show AI-calculated price breakdown to customer (based on vehicle type, coverage, complexity from brand analysis, material, timeline) before asking for $250.

**Nothing equivalent exists.** The existing `/api/ai/calculate-pricing` is internal. Need either:
- A new `/api/customer/calculate-quote` endpoint with spec's simplified pricing rules (base rates, coverage multiplier, complexity upcharge, rush fee, tax)
- OR a wrapper around the existing endpoint that applies customer-facing rules

The spec's pricing formula is simple enough to implement in the route itself without Claude if desired.

**Complexity:** MEDIUM — new endpoint + UI panel in intake flow.

---

### 3.3 Customer-Facing Design Canvas Page
**Spec:** `/design/[designSubmissionId]` with Fabric.js, real-time feedback, vehicle template, submit button.

No public/customer canvas page exists. The internal `/design/[id]` canvas requires auth and is too complex for customers.

New page needed: `app/intake/[token]/design/page.tsx` + `CustomerDesignCanvas.tsx` component that:
- Validates token + checks `payment_status = 'paid'`
- Renders simplified Fabric.js canvas with 1 vehicle template
- Calls `/api/ai/design-feedback` with customer-mode prompt (debounced)
- Shows feedback in right panel
- "Submit My Design" saves canvas JSON to DB + notifies staff

**Complexity:** HIGH — new page, new component, simplified canvas.

---

### 3.4 DB Columns That May Be Missing
Based on code analysis, these columns are referenced but may not be in the actual DB schema (original sprint2b SQL didn't include them):

```sql
-- Add to customer_intake if not already there:
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS payment_amount NUMERIC;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS branding_meta JSONB DEFAULT '{}';
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS design_canvas_data JSONB;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS vehicle_vin TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS vehicle_trim TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS vehicle_condition TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS vehicle_condition_notes TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS wrap_areas JSONB DEFAULT '[]';
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS wrap_type TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS has_existing_wrap BOOLEAN DEFAULT false;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS existing_wrap_description TEXT;
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS damage_photos JSONB DEFAULT '[]';
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS business_photos JSONB DEFAULT '[]';
ALTER TABLE customer_intake ADD COLUMN IF NOT EXISTS references_notes TEXT;
```

**Note:** A migration file in `supabase/migrations/` is the correct way to add these. The `sql/` dir is historical reference only.

---

### 3.5 Adaptive Thinking on Brand Analysis
**Spec:** `thinking: { type: "adaptive" }` on Opus 4.6 brand analysis
**Current:** No adaptive thinking in any route

This is a one-line addition to `/api/ai/analyze-brand/route.ts` in the new-interface branch (line 87 — the `anthropic.messages.create` call). However, note that adaptive thinking **requires** `claude-opus-4-6` or `claude-opus-4-5`, not Sonnet. The current route uses Sonnet 4.6.

If adding adaptive thinking, also switch model to `claude-opus-4-6`.

**Complexity:** LOW — 2 line change, but increases cost significantly.

---

### 3.6 Spec's Standalone DB Tables (DO NOT BUILD)
The spec defines `design_submissions`, `mockups`, `pricing` tables. **Do not create these.** Map to existing:
- `design_submissions` → use `customer_intake` (has all same fields)
- `design_canvas_data` → add column to `customer_intake` (see 3.4)
- `ai_recommendations` → stored in `brand_portfolios.ai_recommendations`
- `mockups` → store URLs in `customer_intake.mockup_urls` JSONB column or `design_proofs`
- `pricing` → return from API, optionally store in `customer_intake.ai_quote` JSONB column

---

## SECTION 4 — CONFLICTS TO RESOLVE

### Conflict 1: Duplicate Stripe Webhooks
**Risk:** HIGH
Two active webhook handlers: `/api/payments/webhook` and `/api/webhooks/stripe`. Both update `customer_intake.payment_status`. If Stripe sends the event to both URLs, the intake record gets double-updated (benign but wasteful). Larger risk: both might insert duplicate `payments` records.

**Resolution:** Pick one canonical webhook. Recommend `/api/payments/webhook` (more complete: has XP award logic). Remove or redirect `/api/webhooks/stripe`, or merge its `invoice.paid` handling into the primary.

---

### Conflict 2: Duplicate Brand Analysis Routes
**Files:** `/api/analyze-brand` vs `/api/ai/analyze-brand`
`/api/analyze-brand` calls `runPipeline('brand_analysis')` which goes to the ai-pipeline service (model configured in DB).
`/api/ai/analyze-brand` calls Anthropic directly with vision support.

The intake flow calls `/api/brand-portfolio/generate-from-intake` which calls `/api/analyze-brand`.
The spec's onboarding flow would call `/api/ai/analyze-brand` (direct, with base64 images).

**Resolution:** No immediate conflict — they serve different call sites. But when building the customer-facing analysis display (Section 3.2), use `/api/ai/analyze-brand` directly (since you'll have base64 images from the uploaded logos). Don't redirect through the pipeline route for customer-facing calls.

---

### Conflict 3: Duplicate $250 Checkout Endpoints
Three checkout routes exist: `/api/payments/create-checkout`, `/api/onboarding/deposit`, `/api/onboarding/create-checkout`. All create $250 Stripe sessions with slightly different metadata and redirects.

**Resolution:** Standardize on `/api/payments/create-checkout` (most complete, has correct intake_token metadata). The intake portal currently calls none of them — when wiring the payment gate, use this one.

---

### Conflict 4: Model Version (Spec vs Existing)
**Spec:** `claude-opus-4-6` everywhere
**Existing:**
- `/api/ai/analyze-brand` → `claude-sonnet-4-6` (cheaper, faster)
- `/api/ai/design-feedback` → `claude-opus-4-6` ✓
- `/api/ai/calculate-pricing` → `claude-opus-4-6` ✓
- `/api/ai/chat` → `claude-sonnet-4-5-20250929` (Genie, intentionally fast)

**Resolution:** Don't blindly upgrade all routes to Opus. The spec's vision-based brand analysis genuinely benefits from Opus. But Genie chatbot is correctly on Sonnet. When building customer-facing pricing endpoint, Opus is overkill — the rules are deterministic enough for Sonnet or even no-AI calculation.

---

### Conflict 5: Canvas Audience (Public vs Auth)
The spec's customer canvas is public (accessible by intake token, no auth). The existing canvas at `/design/[id]` is staff-only (requires auth, redirects to `/login`).

**Resolution:** Build the customer canvas as a separate page at `/intake/[token]/design`. Do NOT modify the existing staff canvas. The two canvases serve different audiences with different tool sets.

---

### Conflict 6: Middleware Public Routes
`lib/supabase/middleware.ts` defines which routes bypass auth. From MEMORY.md, `/intake/` is already public. Any new customer canvas at `/intake/[token]/design` would already be public. However, if creating a `/canvas/[token]` route, add it to middleware.

---

## SECTION 5 — RECOMMENDED BUILD ORDER

### Phase 1: DB Foundations (migration file)
1. Create `supabase/migrations/YYYYMMDDHHMMSS_intake_payment_canvas.sql`
2. Add missing columns to `customer_intake`: `payment_status`, `payment_amount`, `stripe_session_id`, `branding_meta`, `design_canvas_data`, `vehicle_vin`, `vehicle_trim`, `vehicle_condition`, `wrap_areas`, `wrap_type`, `damage_photos`, `has_existing_wrap`
3. Add index on `customer_intake(payment_status)`

### Phase 2: Payment Gate in Intake Portal
1. `CustomerIntakePortal.tsx` — read `payment_status` on load from DB
2. After submit screen: show "Get Your Design Estimate" section
3. Add AI quote request (calls new customer pricing endpoint)
4. Add "Pay $250 — Unlock Design Canvas" button → calls `/api/payments/create-checkout`
5. Handle `?payment=success` URL param — show success state + design canvas link

### Phase 3: Customer-Facing Pricing Endpoint
1. New route: `app/api/customer/calculate-quote/route.ts`
2. Accepts: `intake_token`, `vehicle_type`, `coverage_percent`, `material`, `timeline`
3. Returns simplified quote using spec's pricing rules (no Claude needed — pure math, or lightweight Sonnet call)
4. No auth required — validate by intake_token existence

### Phase 4: Post-Submit Brand Analysis Display
1. In `CustomerIntakePortal.tsx` submitted screen: await `generate-from-intake` response (currently fire-and-forget)
2. Display brand colors, style, complexity score, wrap recommendation to customer
3. This is the "AI brief" that adds value before asking them to pay

### Phase 5: Customer Design Canvas
1. New page: `app/intake/[token]/design/page.tsx`
2. New component: `components/customer/CustomerDesignCanvas.tsx`
3. Simplified Fabric.js canvas (text, image, color picker — 6 tools max)
4. One vehicle template overlay (customer selects type on entry)
5. Real-time AI feedback (calls `/api/ai/design-feedback` with customer prompt mode)
6. "Submit My Design" → saves canvas JSON to `customer_intake.design_canvas_data`, sends notification
7. Add `/intake/[token]/design` to middleware public routes if needed

### Phase 6: Generate Mockup for Customer
1. New route: `app/api/customer/generate-mockup/route.ts`
2. Validates `intake_token` + `payment_status = 'paid'`
3. Uses Claude to craft image prompt from canvas JSON (adapt existing `/api/generate-mockup` logic)
4. Calls Replicate (reuse `ai-pipeline.ts` `runPipeline`)
5. Saves mockup URL to `customer_intake` (new `mockup_urls` JSONB column) or `design_proofs`
6. Notify staff on completion

### Phase 7: Webhook Cleanup
1. Consolidate to single Stripe webhook: `/api/payments/webhook`
2. Move `invoice.paid` handling from `/api/webhooks/stripe` into `/api/payments/webhook`
3. Update Stripe dashboard to point to one URL only

---

## QUICK REFERENCE: File Mapping (Spec → Existing)

| Spec Location | Existing Location | Status |
|---|---|---|
| `design_submissions` table | `customer_intake` table | Use existing |
| `mockups` table | `design_proofs` + storage | Map onto existing |
| `pricing` table | API response only | Store in `customer_intake.ai_quote` |
| `/api/analyze-brand.js` | `/api/ai/analyze-brand/route.ts` | EXISTS — model upgrade needed |
| `/api/calculate-pricing.js` | `/api/ai/calculate-pricing/route.ts` | EXISTS — wrong rules for customer use |
| `/api/design-feedback.js` | `/api/ai/design-feedback/route.ts` | EXISTS — wrong prompt for customer |
| `/api/generate-mockup.js` | `/api/generate-mockup/route.ts` | EXISTS — auth-only, adapt for customer |
| `/api/payments/create-checkout.js` | `/api/payments/create-checkout/route.ts` | EXISTS ✓ |
| `/api/webhooks/stripe.js` | `/api/payments/webhook/route.ts` | EXISTS ✓ (use this one) |
| `pages/design/[id].js` | `app/design/[id]/page.tsx` | EXISTS — staff only, build separate customer version |
| Intake form | `/intake/[token]` + `CustomerIntakePortal.tsx` | EXISTS — add payment gate |
| `customers` table | `customers` table + `customer_intake` table | EXISTS |
| Storage bucket `mockups` | `project-files` bucket | Use existing bucket, new subfolder |

---

## COST NOTE

The spec estimates ~$12/month for 50 customers. Current infrastructure is more capable and correspondingly more expensive per customer (Opus 4.6 vs Sonnet, flux-1.1-pro-ultra vs flux-schnell). If cost is a concern:
- Use `claude-sonnet-4-6` for pricing calculations (deterministic math doesn't need Opus)
- Use `flux-schnell` for quick customer mockup drafts
- Reserve `claude-opus-4-6` + adaptive thinking for brand analysis only

Actual estimated cost at 50 customers/month with current infrastructure: ~$25-40/month.
