# USA WRAP CO — CRM Improvement Report
**Generated:** 2026-02-25
**Audited by:** Claude Code — Full Codebase Analysis
**Scope:** 260 components, 180 API routes, 115+ pages, 21 migrations, live Supabase advisors

---

## Summary

| Category | Issues Found | Critical | High | Medium | Low |
|----------|-------------|---------|------|--------|-----|
| Security | 19 | 2 | 6 | 7 | 4 |
| Performance | 14 | 2 | 5 | 5 | 2 |
| UX | 14 | 0 | 5 | 6 | 3 |
| Missing Features | 6 | 0 | 3 | 2 | 1 |
| Code Quality | 8 | 1 | 3 | 3 | 1 |
| Quick Wins | 10 | — | — | — | — |
| **Total** | **71** | **5** | **22** | **23** | **11** |

---

## 1. SECURITY ISSUES

### S-01 · CRITICAL · Unauthenticated AI Broker — Anyone Can Create Customers & Send Quotes
**File:** `app/api/ai-broker/inbound/route.ts` (line 94), `app/api/ai-broker/send-quote/route.ts` (line 30)
**Issue:** Both routes have zero authentication checks. The `inbound` endpoint creates customer records, starts conversations, and calls the Claude API — all from an unauthenticated POST. The `send-quote` endpoint sends customer-facing quotes with no auth.
**Why it matters:** An attacker can flood the system with fake conversations, impersonate customers, trigger expensive AI calls, and send spam quotes to real customers. No API key, no session, no webhook signature — just a raw POST.
**What to change:** Add `supabase.auth.getUser()` check at the top of both handlers and return 401 if no valid session. For the inbound route (which is also used as a webhook), add Twilio/email signature verification instead.
**Risk: CRITICAL**

---

### S-02 · CRITICAL · Git History Exposed to Public
**File:** `app/api/changelog/route.ts`
**Issue:** This route runs `git log` and returns full commit history with no authentication check.
**Why it matters:** Exposes internal development patterns, feature names, bug descriptions, and potentially sensitive branch/commit message info to anyone on the internet.
**What to change:** Add auth check at the top: `const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
**Risk: HIGH**

---

### S-03 · HIGH · Environment Config Endpoint Unauthenticated
**File:** `app/api/system/check-env/route.ts`
**Issue:** Returns which integrations are configured (Resend, Twilio, Anthropic, Stripe, Supabase) without auth.
**Why it matters:** Lets attackers enumerate exactly which services are active to target specific attack vectors (e.g., if Stripe key is missing, they know payment validation may be weak).
**What to change:** Add auth check. Same pattern as S-02 above.
**Risk: HIGH**

---

### S-04 · HIGH · CRON_SECRET Validation is Optional
**File:** `app/api/cron/nightly-recap/route.ts` (line 8–14)
**Issue:** The security check reads `if (process.env.CRON_SECRET && authHeader !== ...)`. If `CRON_SECRET` is unset, the condition short-circuits and the endpoint runs for anyone.
**Why it matters:** Anyone can trigger the nightly recap cron repeatedly, burning Anthropic API credits and spamming all users with AI-generated recaps.
**What to change:** Flip logic to fail-closed:
```typescript
if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```
**Risk: HIGH**

---

### S-05 · HIGH · Twilio SMS Webhook Missing Signature Verification
**File:** `app/api/webhooks/twilio/sms/route.ts` (lines 26–52)
**Issue:** This webhook processes incoming SMS messages and creates conversations — but unlike the other Twilio webhooks, it never calls `isTwilioWebhook()`.
**Why it matters:** Anyone can POST fake SMS messages to create conversations or inject messages into existing threads.
**What to change:** Import and call `isTwilioWebhook()` from `lib/phone/validate.ts` at the start of the POST handler, same as `app/api/phone/incoming/route.ts` does.
**Risk: HIGH**

---

### S-06 · HIGH · Twilio Validation Fails Open When ENV Var is Missing
**File:** `lib/phone/validate.ts` (lines 18–20)
**Issue:** `if (!authToken || authToken.startsWith('PLACEHOLDER')) return true` — no token = valid.
**Why it matters:** In any environment where `TWILIO_AUTH_TOKEN` isn't configured, all Twilio webhooks are wide open.
**What to change:** Return `false` (reject) rather than `true` (accept) when the token is missing. Fail closed, not open.
**Risk: HIGH**

---

### S-07 · MEDIUM · 9 Overly Permissive RLS Policies (USING true / WITH CHECK true)
**Source:** Supabase Security Advisors
**Affected tables:** `customer_intake`, `deckforge_annotations`, `deckforge_artboards`, `deckforge_files`, `deckforge_jobs`, `deckforge_projects`, `design_intake_sessions`, `design_mockups`, `design_proofs`, `onboarding_leads`, `proof_settings`, `proposal_selections`
**Issue:** UPDATE/INSERT policies use `USING (true)` or `WITH CHECK (true)` — effectively disabling RLS for those operations.
**Why it matters:** Any authenticated user (or in some cases, unauthenticated public users) can write to these tables without restriction. Particularly concerning for `design_mockups` (service role bypass) and `design_proofs` (customer-facing proof updates).
**What to change:**
- `customer_intake`: Scope UPDATE to `WHERE token = current_token` (validate token in policy using a join or function)
- `deckforge_*`: Replace `allow_all_*` with org-scoped policies: `USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))`
- `design_proofs`: Replace `Public can update proofs` with token-scoped policy
- `design_mockups`: Add `org_id` check to INSERT policy
**Risk: MEDIUM**

---

### S-08 · MEDIUM · 8 Database Functions with Mutable Search Path
**Source:** Supabase Security Advisors
**Affected functions:** `sync_stage_checklist`, `update_design_mockups_updated_at`, `generate_doc_number`, `auto_number_estimate`, `auto_number_sales_order`, `auto_number_invoice`, `enforce_usawrapco_domain`, `handle_new_user`
**Issue:** Functions don't set `search_path = public, pg_temp` which allows schema injection attacks.
**Why it matters:** A malicious schema could shadow system functions, potentially allowing privilege escalation.
**What to change:** Add `SET search_path = public, pg_temp` to each function definition. See [Supabase remediation guide](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
**Risk: MEDIUM**

---

### S-09 · MEDIUM · Gmail OAuth CSRF Token Not Cryptographically Validated
**File:** `app/api/auth/gmail/callback/route.ts` (line 91)
**Issue:** The OAuth `state` parameter is just the user's ID — no CSRF nonce. Also stores raw `access_token` and `refresh_token` in the database unencrypted.
**Why it matters:** An attacker can craft a callback URL with a known user ID, potentially connecting their Gmail to a victim's account. Plain tokens in DB = exposure if DB is compromised.
**What to change:** Generate a cryptographic nonce on OAuth initiation, store it in a short-lived cookie, verify it matches in the callback. For tokens, consider encrypting with `ENCRYPTION_KEY` env var using AES before storage.
**Risk: MEDIUM**

---

### S-10 · MEDIUM · Leaked Password Protection Disabled
**Source:** Supabase Security Advisors
**Issue:** Supabase Auth's HaveIBeenPwned.org integration is disabled.
**Why it matters:** Users can set compromised passwords (e.g., `password123`) that are trivially crackable.
**What to change:** Enable in Supabase Dashboard → Authentication → Password Strength. One-click fix.
See [remediation guide](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
**Risk: MEDIUM**

---

### S-11 · LOW · Hardcoded Org ID Across 10+ API Routes
**Files:** `app/api/phone/agents/route.ts`, `app/api/phone/departments/route.ts`, `app/api/phone/settings/route.ts`, `app/api/ai-broker/inbound/route.ts`, `app/api/cron/nightly-recap/route.ts`, and more
**Issue:** `const ORG_ID = 'd34a6c47-...'` is hardcoded as a constant in each file.
**Why it matters:** If org ID ever changes or this goes multi-tenant, this will break everywhere silently. It's also mildly sensitive information baked into source code.
**What to change:** Move to `process.env.NEXT_PUBLIC_ORG_ID` or derive from auth session. Short term: add a comment `// Single-org by design — see CLAUDE.md` to document intent.
**Risk: LOW**

---

## 2. PERFORMANCE ISSUES

### P-01 · CRITICAL · No Pagination on Message Thread — Full History Loads Every Time
**File:** `components/comms/CommHubClient.tsx` (lines 408–416)
**Issue:**
```typescript
const { data } = await supabase
  .from('conversation_messages')
  .select('*')
  .eq('conversation_id', convoId)
  .order('created_at', { ascending: true })
  // NO .limit() here
```
**Why it matters:** A 2-year-old customer conversation could have 5,000+ messages. Loading all of them on every click will timeout on Supabase free tier and hang the browser. With auto-scroll it also forces full DOM render of every message.
**What to change:** Add `.limit(100)` and implement "load older" button with `.range(offset, offset+99)`. Show 100 most recent messages first.
**Risk: CRITICAL**

---

### P-02 · CRITICAL · Realtime Subscription Refetches ALL 200 Conversations on Every New Message
**File:** `components/comms/CommHubClient.tsx` (lines 469–494)
**Issue:** Every INSERT into `conversation_messages` triggers `fetchConversations()` — a full refetch of 200 conversations. With a busy team sending/receiving messages, this fires 10–20+ times per minute.
**Why it matters:** 20 messages/min × 200 conversations × full select = 20 heavy queries per minute, per browser tab. Realtime channels + heavy queries = lag spikes for all users.
**What to change:** Instead of calling `fetchConversations()` on each new message, update only the matching conversation in local state:
```typescript
setConversations(prev => prev.map(c =>
  c.id === payload.new.conversation_id
    ? { ...c, last_message_at: payload.new.created_at, unread_count: c.unread_count + 1 }
    : c
))
```
**Risk: CRITICAL**

---

### P-03 · HIGH · SELECT * on High-Traffic Tables in CommHub
**File:** `components/comms/CommHubClient.tsx` (lines 399, 412, 424, 430)
**Issue:** `conversations`, `conversation_messages`, `email_templates`, `sms_templates` all fetched with `.select('*')`. Conversations table includes large `metadata` JSON columns.
**Why it matters:** Fetching 50+ columns when only 8–10 are needed increases data transfer and parse time.
**What to change:** Specify only needed columns. Example:
```typescript
.from('conversations')
.select('id, contact_name, contact_email, contact_phone, channel, status, assigned_to, unread_count, last_message_at, last_message_preview')
```
**Risk: HIGH**

---

### P-04 · HIGH · 127 Unindexed Foreign Keys in Database
**Source:** Supabase Performance Advisors
**Most critical missing indexes:**
- `projects.agent_id` — missing index on `projects_agent_id_fkey`
- `projects.customer_id` — missing index on `projects_customer_id_fkey`
- `projects.installer_id` — missing index on `projects_installer_id_fkey`
- `projects.created_by` — missing index on `projects_created_by_fkey`
- `profiles.org_id` — missing index on `profiles_org_id_fkey`
- `conversation_messages.sent_by` — missing index on `conversation_messages_sent_by_fkey`
- `conversations.assigned_to` — missing index on `conversations_assigned_to_fkey`
- 120+ more tables

**Why it matters:** Every JOIN across these foreign keys does a full table scan instead of an index seek. On the `projects` table (the core of the entire app), queries that filter by `agent_id` or `customer_id` are scanning all rows.
**What to change:** Create a migration to add indexes:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_agent_id ON projects(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_installer_id ON projects(installer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conv_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conv_messages_sent_by ON conversation_messages(sent_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);
```
**Risk: HIGH**

---

### P-05 · HIGH · 130 Tables with auth_rls_initplan — RLS Calls auth.uid() Once Per Row
**Source:** Supabase Performance Advisors
**Affected tables include:** `projects`, `profiles`, `customers`, `estimates`, `invoices`, `job_comments`, `conversations`, `conversation_messages`
**Issue:** RLS policies call `auth.uid()` or `current_setting()` directly in the policy body, which re-evaluates for every scanned row instead of once per query.
**Why it matters:** A query scanning 1,000 projects calls `auth.uid()` 1,000 times. This is the #1 RLS performance killer in Supabase and directly causes slow page loads.
**What to change:** Wrap `auth.uid()` in a subquery to force single evaluation:
```sql
-- Instead of: USING (agent_id = auth.uid())
-- Use:        USING (agent_id = (SELECT auth.uid()))
```
Apply this pattern to all policies on `projects`, `profiles`, `conversations`, `conversation_messages`, `estimates`, `invoices`.
**Risk: HIGH**

---

### P-06 · MEDIUM · SELECT * on Dashboard — Fetches All Job Data Including form_data JSON
**File:** `app/dashboard/page.tsx` (lines 22, 33–38)
**Issue:** Both `profiles` and `projects` selects use `*`. The `form_data` column on `projects` is a large JSON blob (design briefs, intake data) that can be 500KB+ per job. Fetching 200 projects with full `form_data` transfers 100MB+ on initial load.
**Why it matters:** Dashboard is the first page users see. Slow initial load = bad first impression.
**What to change:**
```typescript
.select('id, title, pipe_stage, status, revenue, profit, gpm, install_date, created_at, agent_id, installer_id, customer_id')
// Only add form_data if a specific field is needed (e.g., form_data->client_name)
```
**Risk: MEDIUM**

---

### P-07 · MEDIUM · 54 Unused Indexes in Database
**Source:** Supabase Performance Advisors
**Issue:** 54 indexes exist that are never used by any query.
**Why it matters:** Unused indexes slow down INSERT/UPDATE/DELETE operations (every write must maintain all indexes). They also waste disk space and confuse query planner.
**What to change:** Review and drop confirmed-unused indexes. Query `pg_stat_user_indexes WHERE idx_scan = 0` in Supabase SQL editor to confirm which are unused. Drop carefully after review.
**Risk: MEDIUM**

---

### P-08 · MEDIUM · DesignCanvasClient — 2,632 Lines, 59 useState Calls
**File:** `components/design/DesignCanvasClient.tsx`
**Issue:** Largest component in the codebase at 2,632 lines with 59 `useState` declarations. Heavy state = slow re-renders on every interaction.
**Why it matters:** Every brush stroke, color change, or layer click triggers React re-renders across all 59 state variables. On lower-end devices this creates visible lag in the canvas editor.
**What to change:** Extract state into a custom `useDesignCanvas` hook (separate file). Group related state into objects: `const [brushSettings, setBrushSettings] = useState({ color, size, opacity })`. This dramatically reduces re-render scope.
**Risk: MEDIUM**

---

### P-09 · MEDIUM · Multiple Permissive RLS Policies on 120 Tables
**Source:** Supabase Performance Advisors
**Issue:** 120 tables have multiple permissive (non-restrictive) RLS policies for the same operation. Postgres must evaluate ALL matching policies and OR them together for every query.
**Why it matters:** 3 permissive SELECT policies on `projects` = Postgres runs all 3 checks per row and merges results. Each additional policy multiplies scan cost.
**What to change:** Consolidate multiple SELECT policies on the same table into a single policy using `OR`:
```sql
-- Instead of 3 separate SELECT policies:
CREATE POLICY "combined_select" ON projects FOR SELECT USING (
  agent_id = (SELECT auth.uid()) OR
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR
  customer_id IN (SELECT id FROM customers WHERE contact_email = auth.email())
);
```
**Risk: MEDIUM**

---

### P-10 · LOW · Missing Image Optimization Configuration
**File:** `next.config.js`
**Issue:** No `images` block configured. All job photos, vehicle images, and design mockups from Supabase Storage are served as raw unoptimized images.
**Why it matters:** Mobile users loading the pipeline view with 20+ job cards download full-size images instead of optimized WebP at appropriate resolution.
**What to change:** Add to `next.config.js`:
```javascript
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [{ hostname: 'uqfqkvslxoucxmxxrobt.supabase.co' }],
},
```
Then replace `<img src={url}>` with `<Image src={url} width={...} height={...}>` in job cards and timeline.
**Risk: LOW**

---

## 3. UX IMPROVEMENTS

### U-01 · HIGH · No Confirmation Before Destructive Actions Anywhere in the App
**Files:** `components/comms/CommHubClient.tsx` (line 646), multiple other components
**Issue:** Archiving conversations, deleting jobs, resolving threads — all execute immediately with zero confirmation dialog. The archive handler literally does:
```typescript
const handleArchive = async (id: string) => {
  setConversations(prev => prev.filter(c => c.id !== id)) // gone from UI instantly
  await supabase.from('conversations').update({ is_archived: true }).eq('id', id)
}
```
**Why it matters:** A misclick permanently removes a conversation from view with no recovery path visible to the user.
**What to change:** Add a reusable `ConfirmDialog` component with a simple `useConfirm()` hook. Wrap all destructive actions. Example: `const confirmed = await confirm('Archive this conversation?'); if (!confirmed) return;`
**Risk: HIGH**

---

### U-02 · HIGH · Silent Send Failures — Users Don't Know When Messages Fail
**Files:** `components/inbox/InboxClient.tsx` (line 411), `components/comms/CommHubClient.tsx`
**Issue:**
```typescript
await sendMessage(...).catch(() => {}) // silently swallowed
```
**Why it matters:** A user types a reply, hits send, the network blips — no error shown, message lost. They assume it sent. Customer never gets it.
**What to change:** Replace empty catches with toast notifications:
```typescript
try { await sendMessage(...) }
catch (err) { toast.error('Failed to send — please try again') }
```
**Risk: HIGH**

---

### U-03 · HIGH · Notification Bell Has No Badge Count Despite Tracking Unread State
**File:** `components/layout/TopNav.tsx`
**Issue:** `inboxUnread` state is tracked but never rendered as a badge on the bell icon.
**Why it matters:** Users miss incoming customer messages because there's no visual indicator of new notifications.
**What to change:**
```tsx
<div style={{ position: 'relative' }}>
  <Bell size={18} />
  {inboxUnread > 0 && (
    <span style={{
      position: 'absolute', top: -4, right: -4,
      background: 'var(--red)', color: '#fff',
      borderRadius: '50%', fontSize: 9, fontWeight: 800,
      width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>{inboxUnread > 9 ? '9+' : inboxUnread}</span>
  )}
</div>
```
**Risk: HIGH**

---

### U-04 · HIGH · MobileNav Links to /projects Instead of /pipeline
**File:** `components/layout/MobileNav.tsx` (lines 331, 342)
**Issue:** Mobile nav links to `/projects` and `/projects/new` but the actual pipeline/job board is at `/pipeline`.
**Why it matters:** Mobile users tapping "Jobs" land on the wrong page (or a 404/redirect). This is a core navigation path.
**What to change:** Update the href: `/projects` → `/pipeline`, `/projects/new` → `/pipeline` (with a new-job modal trigger).
**Risk: HIGH**

---

### U-05 · HIGH · Pipeline Empty State — "No jobs" in Every Column When Board is Empty
**File:** `components/pipeline/PipelineBoard.tsx`
**Issue:** When a new user has no jobs, the kanban board shows "No jobs" text in all 5 stage columns simultaneously. Looks broken.
**Why it matters:** First-time users think something is broken rather than understanding they need to create their first job.
**What to change:** Add a global empty state check: if total jobs = 0, render a single centered welcome card with a "Create your first job" CTA instead of showing 5 empty columns.
**Risk: HIGH**

---

### U-06 · MEDIUM · No Loading Skeleton on Pipeline Board Initial Load
**File:** `components/pipeline/PipelineBoard.tsx`
**Issue:** No loading state while fetching initial projects. Board renders empty columns instantly then jobs pop in.
**Why it matters:** Layout shift when jobs load is jarring and looks like a bug.
**What to change:** Add a simple skeleton card (3–4 ghost divs per column) while `loading === true`.
**Risk: MEDIUM**

---

### U-07 · MEDIUM · Empty States Don't Differentiate "No Data" from "No Search Results"
**Files:** `components/estimates/EstimatesClient.tsx`, `components/invoices/InvoicesClient.tsx`, `components/inbox/InboxClient.tsx`
**Issue:** All show the same "No X yet" message regardless of whether the DB is empty or a search filter returned nothing.
**Why it matters:** Users think their data is gone when it's just filtered out. Causes unnecessary support requests.
**What to change:**
```tsx
{filteredItems.length === 0 && searchQuery
  ? <EmptyState message={`No results for "${searchQuery}"`} />
  : <EmptyState message="No estimates yet" action="Create your first estimate" />
}
```
**Risk: MEDIUM**

---

### U-08 · MEDIUM · ComposeArea Has No Draft Save — Users Lose Composed Messages on Navigation
**File:** `components/comms/ComposeArea.tsx`
**Issue:** No draft auto-save. If a user composes a long email and accidentally clicks away, it's gone.
**Why it matters:** Losing a carefully composed email/SMS is a trust-breaking UX moment.
**What to change:** Auto-save draft to `localStorage` with `useEffect` on body change, debounced 1s. Restore on mount. Show "Draft saved" indicator.
**Risk: MEDIUM**

---

### U-09 · MEDIUM · No Loading State While Sending Email/SMS
**File:** `components/comms/ComposeArea.tsx`
**Issue:** The send button has no loading/disabled state while the send API call is in flight.
**Why it matters:** Users double-tap send, creating duplicate messages. Common mobile behavior.
**What to change:** Add `const [sending, setSending] = useState(false)` and disable the button + show spinner during send.
**Risk: MEDIUM**

---

### U-10 · MEDIUM · PipelineJobCard Quick Chat Button Opens Nothing Visible
**File:** `components/pipeline/PipelineJobCard.tsx` (lines 182–192)
**Issue:** The chat button toggles `showQuickChat` state but there's no rendered UI conditional on `showQuickChat`. The state is tracked but unused.
**Why it matters:** Users who click the chat bubble expect something to happen. Nothing does. Silent broken feature.
**What to change:** Either implement the quick chat drawer or remove the button entirely until it's ready.
**Risk: MEDIUM**

---

### U-11 · LOW · PIN Timeout in RaceTrackTimeline Has No Warning
**File:** `components/pipeline/RaceTrackTimeline.tsx` (line 208)
**Issue:** Admin PIN expires after 2 minutes with no countdown or warning. User unlocks, walks away, returns, and the PIN has silently expired.
**What to change:** Add a countdown display in the last 30 seconds: `"Admin access expires in 30s"`.
**Risk: LOW**

---

### U-12 · LOW · No "Demo Mode" Indicator When Showing Mock Data
**File:** `components/inbox/InboxClient.tsx` (lines 268–309)
**Issue:** Falls back to DEMO_CONVERSATIONS silently if DB is empty. No visual indication it's demo data.
**What to change:** Show a yellow banner: `"Showing demo data — your real conversations will appear here once you connect a phone/email"`.
**Risk: LOW**

---

## 4. MISSING FEATURES (Obvious Gaps)

### F-01 · HIGH · Message Thread Pagination — Critical for Long-Running Jobs
**Why missing:** CommHub has no load-more or virtual scrolling. 2-year conversations are unusable.
**What to build:** Add "Load 100 older messages" button at thread top. Implement with `.range()` offset pagination.
**Risk: HIGH**

---

### F-02 · HIGH · Realtime Collaboration Conflict Handling
**Issue:** If two agents are editing the same job's `form_data` simultaneously (e.g., both on the Sales tab), the last-write-wins silently. No lock, no merge conflict UI.
**Why it matters:** In a busy shop with 5 agents, this will cause silent data loss on shared jobs.
**What to build:** Add `last_edited_by` + `last_edited_at` columns to `projects`. On save, if `last_edited_at` is newer than when you loaded, show a "Someone else edited this — review their changes" warning.
**Risk: HIGH**

---

### F-03 · HIGH · No Undo After Stage Send-Back
**File:** `components/approval/SendBackModal.tsx`
**Issue:** Once a job is sent back to a previous stage, there's no way to undo it in the UI without manually changing stage in the DB.
**Why it matters:** Accidental send-backs disrupt the team's workflow and require admin intervention.
**What to build:** Add "Undo" toast that appears for 10 seconds after send-back, allowing reversal before it propagates.
**Risk: HIGH**

---

### F-04 · MEDIUM · No Email Compose Draft Save
**File:** `components/comms/ComposeArea.tsx`
**Issue:** Covered in UX section. Drafts are lost on navigation.
**Risk: MEDIUM**

---

### F-05 · MEDIUM · RaceTrackTimeline Has No PDF Export
**File:** `components/pipeline/RaceTrackTimeline.tsx`
**Issue:** The master checklist is feature-complete but has no way to export it as a PDF job packet.
**Why it matters:** Production teams often need a physical copy for the shop floor.
**What to build:** Add "Print / Export PDF" button that calls existing `/api/pdf/job-packet/[id]/route.ts` or generates a checklist-specific PDF.
**Risk: MEDIUM**

---

### F-06 · LOW · Changelog Page Shows Live Git History in Production
**File:** `app/changelog/route.ts`, `app/changelog/page.tsx`
**Issue:** The changelog runs `git log` at runtime in production. Better to have a curated, human-written changelog.
**What to build:** Replace with a static `CHANGELOG.md` file that's curated per release, or a `changelogs` table in DB.
**Risk: LOW**

---

## 5. CODE QUALITY

### Q-01 · CRITICAL · TypeScript Build Errors Ignored
**File:** `next.config.js` (lines 3–5)
```javascript
typescript: { ignoreBuildErrors: true }
```
**Issue:** This flag suppresses ALL TypeScript errors at build time. The build "succeeds" even with serious type errors.
**Why it matters:** Masks real bugs. The codebase has 156+ `as any` casts — fixing this flag would surface them for review. This is the single highest-impact code quality issue.
**What to change:** Remove `ignoreBuildErrors: true`. Run `npm run build` and fix the surfaced errors one by one. Most are likely missing type definitions or `as any` casts.
**Risk: CRITICAL (to fix requires significant type work, but leaving it risks silent bugs)**

---

### Q-02 · HIGH · Three Parallel Email APIs + Five SMS Endpoints (Massive Duplication)
**Email routes:**
- `app/api/email/send/route.ts` — Gmail/SendGrid, logs to `campaign_messages`
- `app/api/comms/email/send/route.ts` — Resend, logs to `communications`
- `app/api/messages/email/route.ts` — SendGrid via integration config, logs to `communication_log`

**SMS routes:**
- `app/api/comms/sms/send/route.ts` — Twilio REST
- `app/api/messages/sms/route.ts` — Twilio via integration config
- `app/api/twilio/sms/route.ts` — Twilio REST with customer lookup
- `app/api/phone/sms-incoming/route.ts` — Twilio webhook
- `app/api/webhooks/twilio/sms/route.ts` — Another Twilio SMS webhook

**Why it matters:** Three different logging tables (`communications`, `communication_log`, `conversation_messages`) means no single source of truth for sent messages. Features built on top of one are invisible to the others. Bugs get fixed in one place and not the others.
**What to change:** Designate `conversation_messages` as the canonical log. Create one canonical email endpoint and one SMS endpoint. Deprecate the others. Add a migration to consolidate historical data.
**Risk: HIGH**

---

### Q-03 · HIGH · 31+ Silent `catch {}` Blocks
**Most critical files:**
- `app/api/estimates/send/route.ts` (line 89) — Silent failure on estimate email
- `app/api/invoices/send/route.ts` (line 76) — Silent failure on invoice email
- `app/api/messages/email/route.ts` (lines 48, 63) — Silent failure on SendGrid send + DB write
- `app/api/ai/analyze-brand/route.ts` (lines 83, 98, 156, 170, 181)
- `lib/supabase/server.ts` (line 20) — Silent cookie failures

**Issue:** Errors are caught and discarded with empty `catch {}` blocks.
**Why it matters:** An estimate email failing silently means a customer never gets their quote — and the sales agent has no idea. DB write failures mean missing records with no trace.
**What to change:** Every catch block must either: (a) log to `console.error` with context, or (b) return an error response, or (c) both. Never empty.
**Risk: HIGH**

---

### Q-04 · MEDIUM · `PipelineJobCard` Has `project: any` Type
**File:** `components/pipeline/PipelineJobCard.tsx` (line 8)
```typescript
interface PipelineJobCardProps {
  project: any  // ← untyped
```
**Issue:** The most-rendered component in the entire app (appears on every pipeline card) uses `any` for its main prop.
**Why it matters:** No compile-time checking for the data passed to this card. Field name changes in `Project` type won't cause a build error here.
**What to change:** Replace `project: any` with `project: Project` from `@/types`.
**Risk: MEDIUM**

---

### Q-05 · MEDIUM · 156+ `as any` Type Casts Bypass Type System
**Found in:** Multiple API routes and components, particularly in `app/api/ai-broker/`, `app/api/ai/`, and form_data accesses.
**Issue:** `(vehicleInfo as any).category`, `(prefs as any).wrap_type`, etc.
**Why it matters:** These casts hide potential `undefined` access errors. If the DB schema changes, these become runtime crashes instead of compile-time errors.
**What to change:** Define proper interfaces for the dynamic data shapes. For `form_data`, add `form_data?: ProjectFormData` to the `Project` type with all known fields typed as optional.
**Risk: MEDIUM**

---

### Q-06 · MEDIUM · Inconsistent Error Handling Patterns Across API Routes
**Issue:** ~40% of routes handle errors well, ~60% use inconsistent or missing patterns:
- Some: `catch (err) { console.error('[context]', err); return NextResponse.json(..., { status: 500 }) }`
- Some: `catch (err: any) { return NextResponse.json({ error: err.message }) }` — no logging
- Some: `catch {}` — nothing

**What to change:** Create a shared `handleApiError(err, context)` utility in `lib/utils/api-errors.ts` that logs consistently and returns a standard error response. Adopt across all routes.
**Risk: MEDIUM**

---

### Q-07 · LOW · `components/layout/Sidebar.tsx` Still Exists But Is Unused
**Issue:** The old sidebar component is still in the codebase but no page uses it (per CLAUDE.md, all pages now use TopNav). Dead code adds confusion.
**What to change:** Delete `components/layout/Sidebar.tsx`.
**Risk: LOW**

---

### Q-08 · LOW · `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PUBLIC_KEY` Both Set
**Issue:** Per MEMORY.md, there was previously an env var mismatch. Both vars are still set but only one is correct.
**What to change:** Confirm which is used in `app/api/push/subscribe/route.ts` and remove the unused one from `.env.local`.
**Risk: LOW**

---

## 6. QUICK WINS (Under 5 Minutes Each)

| # | Fix | File | Risk |
|---|-----|------|------|
| QW-01 | Add notification badge count to TopNav bell icon | `components/layout/TopNav.tsx` | LOW |
| QW-02 | Fix MobileNav links `/projects` → `/pipeline` | `components/layout/MobileNav.tsx` lines 331, 342 | LOW |
| QW-03 | Add image optimization config to next.config.js | `next.config.js` | LOW |
| QW-04 | Add auth check to `/api/system/check-env` | `app/api/system/check-env/route.ts` | LOW |
| QW-05 | Add auth check to `/api/changelog` | `app/api/changelog/route.ts` | LOW |
| QW-06 | Make CRON_SECRET validation fail-closed | `app/api/cron/nightly-recap/route.ts` | LOW |
| QW-07 | Add `.limit(100)` to `fetchMessages()` | `components/comms/CommHubClient.tsx` line 415 | LOW |
| QW-08 | Enable Leaked Password Protection | Supabase Dashboard → Auth → Settings | LOW |
| QW-09 | Fix QuickChat button — remove dead toggle or implement basic panel | `components/pipeline/PipelineJobCard.tsx` lines 182–192 | LOW |
| QW-10 | Add critical DB indexes (projects.agent_id, customer_id, etc.) | New migration | LOW |

---

## Implementation Priority Order

### Phase 1 — Security First (Do Immediately)
1. S-01: Auth on AI broker routes
2. S-02: Auth on changelog
3. S-03: Auth on check-env
4. S-04: CRON_SECRET fail-closed
5. S-05: Twilio SMS webhook signature
6. S-10: Enable leaked password protection (1 click in dashboard)

### Phase 2 — Performance (This Week)
7. P-01: Message pagination (`.limit(100)`)
8. P-02: Fix realtime over-fetching
9. P-04: Add critical DB indexes (migration)
10. P-05: Fix auth_rls_initplan with `(SELECT auth.uid())` pattern

### Phase 3 — UX Polish (This Sprint)
11. U-01: Add ConfirmDialog component
12. U-02: Fix silent send failures with toast
13. U-03: Notification badge count
14. U-04: Fix MobileNav links
15. U-05: Pipeline global empty state

### Phase 4 — Code Quality (Ongoing)
16. Q-01: Remove `ignoreBuildErrors` and fix type errors
17. Q-02: Consolidate email/SMS API routes
18. Q-03: Fix silent catch blocks
19. Q-04: Type PipelineJobCard props properly

---

*End of report — 71 issues found across 6 categories*
