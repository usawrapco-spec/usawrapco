# INCOMPLETE AUDIT — USA WRAP CO
**Generated:** 2026-02-24
**Branch:** ai-mode
**Scope:** app/, components/, lib/ — all .ts/.tsx files

---

## How to Read This Report

Each item lists:
- **File path : line number**
- What it is
- **Completion %** — rough estimate of how done it is
- **Break risk** — whether finishing it could break adjacent code

---

## 1. NO-OP BUTTON HANDLERS (console.log stubs)

These buttons are visible to users and do absolutely nothing when clicked. Highest priority to fix.

---

### 1.1 StageSidePanel — Quick Actions (all 10 buttons)
**File:** `components/workflow/StageSidePanel.tsx:190-227`

The function `getQuickActionsForStage()` returns action buttons for every pipeline stage. All 10 buttons have `onClick: () => console.log(...)` as their handler — no API calls, no state updates, no navigation.

| Line | Button Label | Stage | What it should do |
|------|-------------|-------|-------------------|
| 196 | Convert to Qualified | sales_in | Update project stage / create qualification record |
| 197 | Send Follow-Up | sales_in | Trigger email/SMS via comms API |
| 202 | Send to Print Queue | production | POST to print schedule or update stage |
| 203 | Mark as Printed | production | Update stage_approvals or project status |
| 208 | Schedule Install | install | Open calendar / create time_block |
| 209 | Send to Installers | install | Open installer bid flow |
| 214 | Pass QC | prod_review | Advance to sales_close stage |
| 215 | Request Reprint | prod_review | Send job back to production |
| 220 | Generate Invoice | sales_close | POST /api/invoices or redirect |
| 221 | Mark as Paid | sales_close | Update payment status |

**Completion: ~5%** — labels and structure exist, zero logic
**Break risk: LOW** — these buttons are self-contained; implementing them won't break anything that currently works, but the stage transitions will need to align with the sign-off gate logic in `ProjectDetail.tsx`

---

### 1.2 EnhancedCommHub — "Call" Quick Action Button
**File:** `components/communications/EnhancedCommHub.tsx:1402-1416`

The "Call" button in the Quick Actions panel of the customer comm hub has an empty onClick handler with a `// Trigger call (placeholder)` comment. Clicking it does nothing.

**Completion: ~5%** — button renders, no Twilio click-to-call wired up
**Break risk: LOW** — isolated button; would need Twilio credentials configured. Relates to `app/api/twilio/call/route.ts` which IS implemented (123 lines).

---

## 2. MATH.RANDOM FAKE DATA DISPLAYED AS REAL

These components show randomized numbers to users as if they were real data. Values re-randomize on every render/reload.

---

### 2.1 EnhancedPayrollClient — All payroll demo data is fake
**File:** `components/payroll/EnhancedPayrollClient.tsx:305-421`

When the component cannot load real payroll periods from the DB, it falls back to `buildDemoPeriods()`, `buildDemoRecords()`, and `buildDemoPaySettings()`. These functions generate all financial figures using `Math.random()`:

| Lines | Fake Data |
|-------|-----------|
| 316 | `total_hours: 320 + Math.floor(Math.random() * 40)` |
| 317 | `total_gross: 10800 + Math.floor(Math.random() * 2000)` |
| 318 | `total_net: 8400 + Math.floor(Math.random() * 1500)` |
| 319 | `total_deductions: 2400 + Math.floor(Math.random() * 500)` |
| 343 | `const regHrs = 72 + Math.floor(Math.random() * 8)` |
| 344 | `const otHrs = Math.random() > 0.6 ? Math.floor(Math.random() * 8) : 0` |
| 345 | `const ptoHrs = Math.random() > 0.8 ? 8 : 0` |
| 348 | `const commission = isSales ? 800 + Math.floor(Math.random() * 1200) : 0` |
| 418 | `pto_balance: 40 + Math.floor(Math.random() * 20)` |
| 419 | `sick_balance: 24 + Math.floor(Math.random() * 16)` |

The IDs are prefixed `demo-period-*`, `demo-record-*`, `demo-emp-*` — a clear signal this was built for demo purposes only.

**Completion: ~40%** — the UI and PDF generation are complete; the DB schema (`payroll_periods`, `payroll_entries`) exists per CLAUDE.md. The gap is: the component needs to query real `payroll_periods` + `payroll_entries` tables and remove the fallback demo functions.
**Break risk: MEDIUM** — removing demo mode will surface any gaps in the DB schema or missing RLS policies. The `pdf/pay-stub` route already queries real `payroll_records` and `pay_periods` tables (note: different table names than the component uses — needs reconciliation).

---

### 2.2 EnhancedPayrollClient — PayrollClient chart variation also uses Math.random
**File:** `components/payroll/PayrollClient.tsx:1365`

```ts
const variation = 0.85 + Math.random() * 0.3
```

Used in chart data generation. Each page load produces different chart values.

**Completion: ~70%** — payroll chart renders, just with jitter added to real values
**Break risk: LOW** — removing `variation` and using raw values is a 1-line fix

---

### 2.3 SalesLeaderboard — Installer quality score is random
**File:** `components/leaderboard/SalesLeaderboard.tsx:119`

```ts
quality_score: Math.min(100, 80 + Math.floor(Math.random() * 20)),
```

Every installer is assigned a random "quality score" between 80–100 on every render. No real quality metric is computed from job data.

**Completion: ~20%** — the column displays but has no real logic behind it
**Break risk: LOW** — standalone derived value; would need a definition of what "quality" means (QC pass rate, redo rate, customer ratings, etc.)

---

### 2.4 EnhancedCommHub — Customer health score is random
**File:** `components/communications/EnhancedCommHub.tsx:352`

```ts
setCustomerHealthScore(Math.floor(Math.random() * 40 + 60))
```

The health score (60–100) shown in the customer sidebar regenerates on every thread selection. No real computation from order history, payment behavior, or engagement.

**Completion: ~10%** — display widget exists, no real scoring model
**Break risk: LOW** — isolated to the comm hub sidebar; implementing a real formula won't break anything else

---

### 2.5 ProspectDiscovery — Generates fake businesses when Google API is not configured
**File:** `components/prospects/ProspectDiscovery.tsx:101-107`

When the Google Places API key is missing or returns no results, the component generates fake businesses with random data:

```ts
const fleet = Math.floor(Math.random() * 20) + 1
address: `${Math.floor(Math.random() * 9000) + 1000} Main St...`
phone: `(${Math.floor(Math.random() * 900) + 100})...`
website: Math.random() > 0.3 ? `www...com` : ''
rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10
```

These appear in the search results UI as if they are real businesses.

**Completion: ~50%** — UI and save flow are built; needs Google API key configured or a graceful "no results" empty state instead of fake data
**Break risk: LOW** — isolated to search fallback; remove fake data and show empty state

---

## 3. "COMING SOON" UI STUBS (features labeled but not built)

---

### 3.1 JobDetailTabs — Tab content placeholder
**File:** `components/jobs/JobDetailTabs.tsx:1247-1249`

A component called `ComingSoonTab` renders for any tab with unimplemented content:

```tsx
Coming soon — will display {label.toLowerCase()} here.
```

This message is shown to users when a tab has no real content built yet.

**Completion: ~5%** — placeholder; need to determine which tabs use it
**Break risk: LOW** — purely additive; tabs just need content filled in

---

### 3.2 EnhancedPayrollClient — Override button is a stub
**File:** `components/payroll/EnhancedPayrollClient.tsx:1395`

```ts
setSuccess('Override functionality coming soon')
```

The "Override" button in payroll shows a success toast with "coming soon" text. No actual override logic is executed.

**Completion: ~5%** — button and modal UI may exist; actual DB write is missing
**Break risk: LOW** — self-contained

---

### 3.3 OnboardingClient — Photo gallery stub
**File:** `components/onboard/OnboardingClient.tsx:836`

```
Gallery coming soon -- share links above for now
```

The gallery section in the onboarding flow is not implemented.

**Completion: ~5%** — text shown; no gallery component
**Break risk: LOW** — additive feature

---

### 3.4 ReferralLandingClient — Gallery stub
**File:** `components/referral/ReferralLandingClient.tsx:370`

```
Gallery coming soon
```

Referral landing page has a gallery placeholder.

**Completion: ~5%**
**Break risk: LOW**

---

### 3.5 SettingsClient — Billing tab is entirely a stub
**File:** `components/settings/SettingsClient.tsx:186-203`

The Billing tab renders a "Starter Plan" card and the message:
> "Billing features coming soon. Contact support for enterprise pricing."

No plan management, upgrade flow, or Stripe billing portal link is wired up.

**Completion: ~10%** — static display only
**Break risk: LOW** — Stripe webhook route exists (`app/api/webhooks/stripe/route.ts`); billing tab would need to connect to it

---

### 3.6 SettingsClient — Integrations tab: 4 disabled "Coming Soon" buttons
**File:** `components/settings/SettingsClient.tsx:209-227`

Four integration cards all have `disabled` buttons labeled "Coming Soon":
- GoHighLevel — sync contacts/pipeline
- Slack — pipeline event notifications
- Google Drive — sync design files
- QuickBooks — sync invoices/financials

Note: A separate `/integrations` settings page (`app/settings/integrations` or similar) may exist with real integration toggles. This tab in SettingsClient is a duplicate/simpler view that was never built out.

**Completion: ~5%** (this tab) — the integrations backend at `app/api/integrations/save/route.ts` is implemented
**Break risk: LOW**

---

### 3.7 vinyl-chat — Voice input button permanently disabled
**File:** `components/vinyl-chat.tsx:339`

```tsx
<button title="Voice input (coming soon)" style={{ opacity: 0.35 }} ...>
```

The microphone/voice input button is permanently greyed out at 35% opacity. No click handler or speech recognition is wired up.

**Completion: ~5%** — button rendered; no Web Speech API or Whisper integration
**Break risk: LOW**

---

## 4. VIN OCR NOT IMPLEMENTED (two duplicate stubs)

Both VIN components capture a photo but then immediately tell the user OCR doesn't work yet.

---

### 4.1 VINInput
**File:** `components/shared/VINInput.tsx:95-97`

```ts
// For now, just notify user that OCR is not implemented
alert('VIN photo captured. OCR extraction will be added in a future update...')
```

**Completion: ~15%** — camera capture works; decode-vin API route is fully implemented (calls NHTSA); the missing piece is sending the captured image through an OCR step before calling decode-vin
**Break risk: LOW**

---

### 4.2 VinLookupField
**File:** `components/shared/VinLookupField.tsx:180`

```ts
alert('VIN photo captured. Automatic OCR extraction is coming soon...')
```

Duplicate of the above stub in a different component.

**Completion: ~15%**
**Break risk: LOW**

---

## 5. alert() CALLS INSTEAD OF PROPER ERROR/FEEDBACK UI

These use `window.alert()` which blocks the browser thread and looks unprofessional. Should be replaced with toast notifications or inline error states.

| File | Line | Message |
|------|------|---------|
| `app/design/[id]/print-layout/page.tsx` | 314 | `'Please save a high-res export from the canvas first...'` |
| `app/design/[id]/print-layout/page.tsx` | 339 | `err.error \|\| 'Export failed'` |
| `app/design/[id]/print-layout/page.tsx` | 343 | `'Export failed. Check console for details.'` |
| `app/portal/[token]/page.tsx` | 143 | `'Please sign your name in the signature box'` |
| `components/design/DesignCanvasClient.tsx` | 811 | `'Please enter a design brief first'` |
| `components/design/DesignCanvasClient.tsx` | 843 | `'AI generation failed: ' + data.error` |
| `components/design/DesignCanvasClient.tsx` | 848 | `'AI generation failed. Check console for details.'` |
| `components/design/DesignCanvasClient.tsx` | 855 | `'Enter a website URL first'` |
| `components/design/DesignCanvasClient.tsx` | 966 | `'High-res export saved — ready for print layout'` |
| `components/design/DesignCanvasClient.tsx` | 969 | `'Failed to save high-res export: ' + err.message` |
| `components/design/DesignCanvasClient.tsx` | 1014 | Print-ready file generated success |
| `components/design/DesignCanvasClient.tsx` | 1017 | `'Failed to prepare for print: ' + err.message` |
| `components/estimates/ConvertToSOModal.tsx` | 48 | `'Please select at least one line item'` |
| `components/estimates/ConvertToSOModal.tsx` | 146 | `'Failed to convert estimate to sales order'` |
| `components/invoices/RecordPaymentModal.tsx` | 31 | `'Please enter a valid payment amount'` |
| `components/invoices/RecordPaymentModal.tsx` | 96 | `'Failed to record payment'` |
| `components/settings/ImportJobsClient.tsx` | 227 | `'Failed to parse file...'` |
| `components/shared/VINInput.tsx` | 97 | OCR stub message |
| `components/shared/VinLookupField.tsx` | 180 | OCR stub message |

**Total: 19 alert() calls across 8 files**

**Completion: ~80%** — logic is correct, just needs `alert()` swapped for the project's Toast system
**Break risk: VERY LOW** — pure UI swap; `components/shared/Toast.tsx` already exists

---

## 6. PLACEHOLDER / SIMULATED API BEHAVIOR

These API routes return fake or demo data under certain conditions. They are intentional fallbacks but should be documented as production gaps.

---

### 6.1 Proposals — Demo Stripe payment intent
**File:** `app/api/proposals/public/[token]/select/route.ts:83-87`

When `STRIPE_SECRET_KEY` is not set or starts with `PLACEHOLDER`:
```ts
// Demo mode — generate fake intent
paymentIntentId = `demo_pi_${Date.now()}`
clientSecret = `demo_secret_${Date.now()}`
```

The response includes `demo: true`. The client-side must handle this correctly or customers could think they completed payment when they didn't.

**Completion: ~75%** — Stripe path is fully implemented; demo mode is a documented bypass
**Break risk: LOW** — only activates when Stripe key is absent

---

### 6.2 Onboarding deposit — Returns null checkout URL when Stripe not configured
**File:** `app/api/onboarding/deposit/route.ts:23-31`

Returns `{ configured: false, checkoutUrl: null }` when Stripe is not configured. The onboarding flow must gracefully handle `checkoutUrl: null`.

**Completion: ~85%** — full Stripe session creation is implemented; this is a legitimate guard
**Break risk: LOW**

---

### 6.3 Design Studio — AI concept generation is simulated
**File:** `app/design-studio/[job_id]/page.tsx:90-101`

```ts
// Simulate AI generation with placeholder concepts
await new Promise(r => setTimeout(r, 3000))
setConcepts([
  '/api/placeholder/concept-1',
  '/api/placeholder/concept-2',
  '/api/placeholder/concept-3',
])
```

The design studio at `/design-studio/[job_id]` (distinct from `/design/[id]` which uses the full Fabric.js canvas) uses a 3-second fake delay and placeholder image URLs. These URLs (`/api/placeholder/concept-*`) do not exist as actual routes — the images will 404.

Note: The full design studio at `components/design/DesignCanvasClient.tsx` has a real AI mockup generation path via `app/api/ai/generate-mockup/route.ts`. The `design-studio/[job_id]` page is an older/simpler page that was never wired up.

**Completion: ~20%** — wizard UI is built; AI integration needs to call `/api/ai/generate-mockup` instead of the placeholder
**Break risk: LOW** — isolated page; won't affect the main `/design/[id]` canvas

---

## 7. YTD DATA — PARTIALLY REAL

### 7.1 Pay Stub PDF — YTD computed but comment is misleading
**File:** `app/api/pdf/pay-stub/[recordId]/route.ts:140-144`

The comment says `// YTD placeholders (would normally come from aggregated data)`, but the code directly below it (lines 329–349) **does** perform a real DB query to aggregate YTD figures from all `payroll_records` for the year. The fallback at lines 141–144 (`record.ytd_gross || grossPay`) only fires if the aggregation query returns 0 rows, which is a valid edge case.

**This is NOT a stub** — the comment is misleading but the implementation is correct. The table queried is `payroll_records` (vs `payroll_entries` referenced in CLAUDE.md — these may need reconciliation).

**Completion: ~90%**
**Break risk: LOW** — works as-is; the comment should just be clarified

---

## 8. SUMMARY TABLE

| # | File | Issue Type | Completion | Break Risk |
|---|------|------------|------------|------------|
| 1.1 | `components/workflow/StageSidePanel.tsx:196-221` | console.log no-ops (10 buttons) | 5% | Low |
| 1.2 | `components/communications/EnhancedCommHub.tsx:1403` | Empty onClick — "Call" button | 5% | Low |
| 2.1 | `components/payroll/EnhancedPayrollClient.tsx:316-419` | Math.random fake payroll data | 40% | Medium |
| 2.2 | `components/payroll/PayrollClient.tsx:1365` | Math.random chart jitter | 70% | Low |
| 2.3 | `components/leaderboard/SalesLeaderboard.tsx:119` | Math.random quality score | 20% | Low |
| 2.4 | `components/communications/EnhancedCommHub.tsx:352` | Math.random health score | 10% | Low |
| 2.5 | `components/prospects/ProspectDiscovery.tsx:101-107` | Math.random fake businesses | 50% | Low |
| 3.1 | `components/jobs/JobDetailTabs.tsx:1248` | "Coming soon" tab content | 5% | Low |
| 3.2 | `components/payroll/EnhancedPayrollClient.tsx:1395` | Override button stub | 5% | Low |
| 3.3 | `components/onboard/OnboardingClient.tsx:836` | Gallery stub | 5% | Low |
| 3.4 | `components/referral/ReferralLandingClient.tsx:370` | Gallery stub | 5% | Low |
| 3.5 | `components/settings/SettingsClient.tsx:186-203` | Billing tab stub | 10% | Low |
| 3.6 | `components/settings/SettingsClient.tsx:209-227` | 4 integration buttons disabled | 5% | Low |
| 3.7 | `components/vinyl-chat.tsx:339` | Voice input disabled | 5% | Low |
| 4.1 | `components/shared/VINInput.tsx:95-97` | VIN OCR not implemented | 15% | Low |
| 4.2 | `components/shared/VinLookupField.tsx:180` | VIN OCR not implemented | 15% | Low |
| 5.x | 8 files (19 instances) | alert() instead of toast | 80% | Very Low |
| 6.1 | `app/api/proposals/public/[token]/select/route.ts:83` | Demo Stripe intent | 75% | Low |
| 6.2 | `app/api/onboarding/deposit/route.ts:23` | Null checkout when no Stripe | 85% | Low |
| 6.3 | `app/design-studio/[job_id]/page.tsx:90-101` | Simulated AI, placeholder URLs | 20% | Low |

---

## 9. WHAT'S NOT INCOMPLETE (CLEARED)

These were investigated but found to be **complete or intentionally designed**:

- **`app/api/vehicles/decode-vin/route.ts`** — Fully implemented; calls NHTSA VPic API
- **`app/api/vehicles/makes/route.ts`** — Fully implemented; calls NHTSA with 24h cache
- **`app/api/vehicles/models/route.ts`** — Fully implemented; calls NHTSA with 6h cache
- **`app/api/pdf/pay-stub/[recordId]/route.ts`** — YTD aggregation IS real; comment is misleading
- **`app/api/proposals/public/[token]/select/route.ts`** — Stripe path is real; demo mode is a guard
- **`app/api/onboarding/deposit/route.ts`** — Stripe session creation is real; graceful degradation when key absent
- **All 111 API routes** — None return hardcoded empty arrays or objects; all integrate with Supabase or external services
- **PLACEHOLDER checks across all API routes** — These are legitimate "not connected" guards per Rule 10 in CLAUDE.md, not stubs
- **`app/engine/page.tsx`**, **`app/workflow/page.tsx`**, **`app/ventures/page.tsx`** — All delegate to real client components (RevenueEngineMap, WrapJobWorkflow, VenturesClient) with proper sizes (216–561 lines)
- **Math.random in confetti animations** (`Toast.tsx`, `SuccessStep.tsx`) — Intentional UX
- **Math.random in canvas element placement** (`DesignCanvasClient.tsx`) — Intentional UX

---

## 10. RECOMMENDED FIX ORDER

**Highest impact, lowest risk:**
1. Replace all 19 `alert()` calls with Toast notifications — pure polish, zero risk
2. Fix `StageSidePanel.tsx` console.log handlers — most visible gap in the workflow UI
3. Replace `Math.random()` in payroll with real DB queries — this is financial data
4. Remove `Math.random()` quality/health scores — replace with real computed values
5. Wire `design-studio/[job_id]` to `/api/ai/generate-mockup` — real API already exists
6. Implement VIN OCR (both components) — decode-vin API is ready; just needs OCR step
7. Wire payroll override button to a real upsert
8. Build billing tab or remove it until Stripe billing is ready
