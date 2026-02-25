# BUGS FIXED — QA Audit 2026-02-25

All bugs found and fixed during full codebase audit. Build passes (`npm run build` exit 0).

---

## CRITICAL: Security — Unauthenticated API Endpoints

### BUG-001 · `GET /api/phone/agents` — no auth check
**File:** `app/api/phone/agents/route.ts:7`
**Issue:** GET handler exposed all phone agent names, roles, and department assignments to anyone without authentication. POST/PATCH/DELETE correctly required auth but GET did not.
**Fix:** Added `createClient` auth check at the top of the GET handler before any DB queries.

### BUG-002 · `GET /api/phone/departments` — no auth check
**File:** `app/api/phone/departments/route.ts:7`
**Issue:** GET handler exposed internal department structure (DTMF key routing, voicemail configuration, round-robin settings) without authentication.
**Fix:** Added auth check to GET handler.

### BUG-003 · `GET /api/phone/settings` — no auth check
**File:** `app/api/phone/settings/route.ts:7`
**Issue:** GET handler leaked business phone configuration (main number, greeting text, hold music, business hours, recording settings) without requiring a logged-in user.
**Fix:** Added auth check to GET handler.

---

## CRITICAL: Build Failure

### BUG-004 · `next build` fails with `SyntaxError: Unexpected end of JSON in pages-manifest.json`
**File:** `app/api/ai/genie-chat/route.ts:3`, `next.config.js`
**Issue:** The `@anthropic-ai/sdk` was instantiated at module level (`const anthropic = new Anthropic(...)`). During Next.js build's "Collecting page data" phase on Windows, the SDK module evaluation caused a race condition that corrupted the pages-manifest.json. Error: `Failed to collect page data for /api/ai/genie-chat`.
**Fix 1:** Moved Anthropic client instantiation inside the POST handler (with early-exit if key is missing).
**Fix 2:** Added `serverComponentsExternalPackages: ['@anthropic-ai/sdk', 'twilio', 'replicate']` to `next.config.js` so these heavy SDK packages are treated as external at build time, preventing module-level constructors from running during page data collection.

---

## CRITICAL: AI Banner Shows Even When Key Is Configured

### BUG-005 · `/api/system/health` cached by Vercel CDN → stale `anthropic: false`
**File:** `app/api/system/health/route.ts`
**Issue:** The health check GET endpoint had no cache-control headers. Vercel's CDN cached the first response (which may have returned `anthropic: false` before the env var was set) for subsequent requests. Also, the `isSet` function didn't handle values with leading/trailing whitespace.
**Fix:** Added `export const dynamic = 'force-dynamic'` and `Cache-Control: no-store, no-cache, must-revalidate` header. Also added `.trim().length > 0` check to `isSet()`.

---

## CRITICAL: Missing Database Table

### BUG-006 · `push_subscriptions` table missing — push notifications would silently fail
**Files:** `app/api/push/send/route.ts`, `app/api/push/subscribe/route.ts`
**Issue:** Push notification API routes existed and referenced `push_subscriptions` table but the table was never created in the database. All push subscription and send operations would fail with Supabase "table does not exist" errors.
**Fix:** Created migration `supabase/migrations/20260225170000_push_subscriptions.sql` with proper schema, RLS policies (users can manage their own subscriptions, service role can read all), and index. Applied to production database.

---

## HIGH: Missing Error Handling — Twilio Webhook Routes

### BUG-007 · `POST /api/phone/incoming` — no try-catch, unprotected formData parse
**File:** `app/api/phone/incoming/route.ts`
**Issue:** The Twilio inbound call webhook had no try-catch. Any Supabase error would cause an unhandled exception returning HTTP 500 to Twilio, causing Twilio to retry the webhook indefinitely. Also, `req.formData()` had no error handling.
**Fix:** Added outer try-catch. On error, returns a safe TwiML `<Hangup/>` response instead of HTTP 500.

### BUG-008 · `POST /api/phone/outbound-twiml` — no try-catch
**File:** `app/api/phone/outbound-twiml/route.ts`
**Issue:** Twilio TwiML webhook with no try-catch. Supabase insert at module level would crash with unhandled promise rejection.
**Fix:** Wrapped in try-catch with TwiML fallback error response.

### BUG-009 · `POST /api/phone/menu` — no try-catch, unprotected formData parse
**File:** `app/api/phone/menu/route.ts`
**Issue:** Inbound call menu routing webhook had no try-catch. Also `req.formData()` had no error handling.
**Fix:** Added outer try-catch with TwiML fallback response.

---

## HIGH: Environment Variable Mismatch

### BUG-010 · `NEXT_PUBLIC_VAPID_PUBLIC_KEY` vs `VAPID_PUBLIC_KEY` mismatch
**File:** `app/api/push/subscribe/route.ts:6`
**Issue:** The subscribe GET endpoint (a server-side API route) read `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` but the send route checked `VAPID_PUBLIC_KEY`. If an operator set `VAPID_PUBLIC_KEY` in Vercel (as the send route documents), the subscribe route would return "Push notifications not configured" even though the key existed — breaking the subscription flow.
**Fix:** Changed subscribe route to read `VAPID_PUBLIC_KEY || NEXT_PUBLIC_VAPID_PUBLIC_KEY` (falling back to the NEXT_PUBLIC variant for backwards compatibility).

---

## MEDIUM: TypeScript Type Bug

### BUG-011 · `'resolved'` missing from `InboxLabel` union type
**File:** `components/comms/types.ts:81`
**Issue:** `ConversationList.tsx` uses `'resolved'` as an `InboxLabel` key in the LABELS array (for the "Resolved" tab) but the `InboxLabel` type only included `'inbox' | 'starred' | 'archived' | 'sent' | 'email' | 'sms' | 'calls' | 'voicemail' | 'unread' | 'mine'`. TypeScript builds were silently skipping this error due to `ignoreBuildErrors: true`, but clicking "Resolved" would pass an invalid type to filter functions.
**Fix:** Added `'resolved'` to the `InboxLabel` union type.

---

## MEDIUM: Project Rules Violations — `window.open()`

### BUG-012 · `window.open('/proposal/...')` for internal navigation
**File:** `components/estimates/ProposalBuilder.tsx:404`
**Issue:** "Preview" button used `window.open()` for an internal route, violating the rule "No window.open(), no target='_blank'. All navigation uses Next.js Link or router.push()."
**Fix:** Added `useRouter` import and replaced with `router.push('/proposal/${publicToken}')`.

### BUG-013 · `window.open('/api/pdf/...')` for PDF downloads
**File:** `components/sales-orders/SalesOrderDetailClient.tsx:430,443`
**Issue:** Download Quote PDF and Down Payment Invoice buttons used `window.open()` to trigger PDF API routes.
**Fix:** Replaced `<button onClick={() => window.open(...)}>`  with `<a href={...}>` elements (semantic HTML for file downloads, avoids `window.open()` entirely).

---

## LOW: Build Warning

### BUG-014 · `outputFileTracingIncludes` shows "Unrecognized key" warning in next.config.js
**File:** `next.config.js`
**Status:** Kept as-is (it functions correctly despite the warning in this Next.js 14.2.15 build version). The `serverExternalPackages` experimental option was added to the same file for BUG-004.

---

## DATABASE: RLS Verification

All tables verified to have RLS enabled via `pg_tables` query:
- `conversations` ✓ (rowsecurity: true)
- `conversation_messages` ✓ (new columns is_starred, is_archived, etc. protected by existing org-level policies)
- `email_templates` ✓ (rowsecurity: true)
- `sms_templates` ✓ (rowsecurity: true)
- `push_subscriptions` ✓ (created in BUG-006 fix with proper policies)

---

## FILES MODIFIED

| File | Change |
|------|--------|
| `app/api/system/health/route.ts` | `force-dynamic`, `no-store` cache header, `.trim()` check |
| `app/api/ai/genie-chat/route.ts` | Moved Anthropic client inside handler, added key check |
| `app/api/phone/agents/route.ts` | Added auth check to GET |
| `app/api/phone/departments/route.ts` | Added auth check to GET |
| `app/api/phone/settings/route.ts` | Added auth check to GET |
| `app/api/phone/incoming/route.ts` | Added try-catch wrapper + formData error handling |
| `app/api/phone/outbound-twiml/route.ts` | Added try-catch wrapper |
| `app/api/phone/menu/route.ts` | Added try-catch wrapper + formData error handling |
| `app/api/push/subscribe/route.ts` | Fixed VAPID key env var name |
| `components/comms/types.ts` | Added `'resolved'` to `InboxLabel` union |
| `components/estimates/ProposalBuilder.tsx` | Replaced `window.open` with `router.push` |
| `components/sales-orders/SalesOrderDetailClient.tsx` | Replaced `window.open` with `<a href>` |
| `next.config.js` | Added `serverComponentsExternalPackages` for SDK packages |
| `supabase/migrations/20260225170000_push_subscriptions.sql` | **New** — push_subscriptions table + RLS |

---

*Audit completed 2026-02-25. Build: `npm run build` exit 0.*
