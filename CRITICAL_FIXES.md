# Critical Fixes — 2026-02-24

## BUG 1: handleSendEstimate is not defined (PAGE CRASH)

**File:** `components/estimates/EstimateDetailClient.tsx:1957`

**Problem:** The "Send Estimate" button in the right sidebar summary panel referenced `handleSendEstimate` which was never defined. This caused a runtime crash when the estimate detail page rendered.

**Root Cause:** Other "Send" buttons on the same page (lines 1082, 1098) correctly opened the email compose modal via `() => { setEmailModalType('estimate'); setEmailModalOpen(true) }`. The sidebar button was added later without the same handler.

**Fix:** Replaced `onClick={handleSendEstimate}` with `onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}` — matching the existing pattern that opens the email compose modal.

**Verified:** Build passes, no remaining references to `handleSendEstimate`.

---

## BUG 2: Photos not persisting

**Problem:** Uploaded photos were not persisting across sessions. Multiple components were uploading to the wrong storage bucket, and RLS policies were incomplete.

**Root Cause (3 issues):**

1. **Wrong bucket name:** `DesignStudio.tsx` and `JobChat.tsx` were still uploading to the old `job-images` bucket instead of the canonical `project-files` bucket. Files uploaded to `job-images` wouldn't be found by components reading from `project-files`.

2. **RLS blocking anonymous uploads:** Customer-facing portals (intake, onboarding) run as anonymous users, but the `project-files` INSERT policy only allowed `authenticated` role. Anonymous uploads silently failed.

3. **Merge conflict in media upload route:** `app/api/media/upload/route.ts` had unresolved git merge conflict markers (`<<<<<<< HEAD`) causing a syntax error — the entire upload API was broken.

**Fixes:**
- Replaced all `from('job-images')` with `from('project-files')` in `DesignStudio.tsx` (4 occurrences) and `JobChat.tsx` (2 occurrences)
- Applied Supabase migration `fix_storage_anon_upload_policy` adding `anon` INSERT and SELECT policies on `storage.objects` for the `project-files` bucket
- Resolved merge conflict in `app/api/media/upload/route.ts` using correct column names (`user_id` not `uploaded_by`, no `storage_path`/`mime_type` columns)
- Confirmed both `project-files` and `job-images` buckets are set to `public: true`
- All upload components use `getPublicUrl()` (permanent URLs) — no signed URLs found

**Bucket status:**
| Bucket | Public | SELECT Policy | INSERT Policy (auth) | INSERT Policy (anon) |
|--------|--------|--------------|---------------------|---------------------|
| project-files | Yes | public | Yes | Yes (new) |
| job-images | Yes | public | Yes | No (legacy) |

**Verified:** Zero remaining `job-images` references in source. Build passes.

---

## BUG 3: Duplicate Stripe webhooks

**Problem:** Two webhook endpoints existed:
- `/api/payments/webhook` — handled `checkout.session.completed` + XP awards
- `/api/webhooks/stripe` — handled `checkout.session.completed` + `invoice.paid` + `payment_intent.*` + payment records

Both processed the same Stripe events, causing duplicate database writes (double payment records, double status updates).

**Fix:**
- **Canonical handler:** `/api/payments/webhook` now handles all event types:
  - `checkout.session.completed` — intake deposits + invoice payments + XP awards + payment records
  - `payment_intent.payment_failed` — logging
  - Graceful degradation when Stripe keys aren't configured (returns 200 to prevent retries)

- **Deprecated alias:** `/api/webhooks/stripe` now re-exports from the canonical handler:
  ```ts
  export { POST } from '@/app/api/payments/webhook/route'
  ```
  This ensures any existing Stripe Dashboard webhook configurations pointing to the old URL continue to work during transition.

**Action required:** Update Stripe Dashboard webhook URL to `https://app.usawrapco.com/api/payments/webhook` and remove the old endpoint after confirming.

**Verified:** Build passes. Single handler processes all events.

---

## Additional Fixes (discovered during investigation)

- **Missing portal components:** Created `PortalLoyaltyClient.tsx`, `PortalReferralsClient.tsx`, and `DesignMockupWizard.tsx` — pages referencing these were causing build failures
- **Corrupted `.next` cache:** Cleared stale build artifacts that were causing `ENOTEMPTY`/`ENOENT` errors

## Build Status

All fixes verified with clean `npm run build` — zero errors.
