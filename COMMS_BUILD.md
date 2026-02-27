# Communications Hub — Build Report

## Audit Findings

### DB Tables (pre-fix)
| Table | Status |
|---|---|
| `sms_conversations` | MISSING — migration `20260228000000_sms_twilio_ai.sql` not yet applied |
| `sms_messages` | MISSING — same migration |
| `app_settings` | MISSING — same migration |
| `conversations` | EXISTS (AI comms system) |
| `conversation_messages` | EXISTS (AI comms system) |
| `call_logs` | EXISTS |
| `calls` | EXISTS (legacy) |
| `sms_templates` | EXISTS — 13 rows |

### API Routes (pre-fix)
| Route | Status |
|---|---|
| `POST /api/twilio/send-sms` | Existed — correct (used `sms_messages`/`sms_conversations`, tables now created) |
| `POST /api/twilio/make-call` | Existed — correct (uses `call_logs`) |
| `GET/POST /api/twilio/settings` | Existed — correct (uses `app_settings`, now created) |
| `POST /api/twilio/inbound-call` | Existed — campaign tracking (repurposed for general voice) |
| `POST /api/twilio/inbound-sms` | MISSING → **CREATED** |
| `POST /api/twilio/call-status` | MISSING → **CREATED** |
| `POST /api/twilio/call/route.ts` | Legacy (uses old `calls` table) |
| `POST /api/twilio/generate-number` | Campaign number provisioning — unchanged |

---

## Fixes Applied

### 1. Migration Applied to Supabase
Applied migration directly via Supabase API (tables didn't exist, blocking all SMS functionality):
- `sms_conversations` — one row per contact phone thread
- `sms_messages` — individual SMS messages per thread
- `app_settings` — global key-value store; seeded `ai_sms_enabled=true`

### 2. `/api/twilio/inbound-sms` — Created
- Receives Twilio `POST` webhook (no auth — public endpoint)
- Looks up customer by phone number in `customers` table
- Finds or creates `sms_conversations` row for the phone number
- Inserts message into `sms_messages` with direction='inbound'
- Checks `app_settings.ai_sms_enabled` and `sms_conversations.ai_enabled`
- If both enabled, fires `POST /api/ai/auto-respond` (fire-and-forget)
- Returns empty TwiML `<Response/>` (AI replies via REST API, not TwiML)

### 3. `/api/twilio/call-status` — Created
- Receives Twilio call status webhook (no auth — public endpoint)
- Maps Twilio status strings to internal status values
- Updates `call_logs.status`, `duration_seconds`, `recording_url`, `ended_at`
- Flags missed calls (`no-answer`/`busy`) for follow-up

### 4. `components/communications/TwilioSmsHub.tsx` — Enhanced
**Added:**
- `SmsTemplate` type interface
- Template state: `templates`, `showTemplates`, `loadingTemplates`
- `loadTemplates()` — fetches all 13 rows from `sms_templates`
- Templates drawer in compose area — click any template to insert text
- Call filter bar: All / Inbound / Outbound / Missed
- Call search input (filters by number or caller name)
- `[Customer]` button in thread header (shown when `customer_id` is set, links to `/customers/[id]`)
- Copy button on each webhook URL in Settings tab
- `TestSmsPanel` component — send test SMS to any number from Settings tab

---

## Twilio Webhook URLs (set these in Twilio console)
| Webhook | URL |
|---|---|
| SMS (A message comes in) | `https://app.usawrapco.com/api/twilio/inbound-sms` |
| Voice (A call comes in) | `https://app.usawrapco.com/api/twilio/inbound-call` |
| Call status callback | `https://app.usawrapco.com/api/twilio/call-status` |

---

## TypeScript Status
- `npx tsc --noEmit` — **0 errors**
- `npm run build` — compiled cleanly; ENOENT on `pages-manifest.json` is a known Windows-only artifact (does not affect Vercel deployment)

---

## SMS Templates Available (13)
1. Appointment Reminder
2. Deposit Confirmation
3. Deposit Reminder
4. Follow-Up 24hr
5. Install Reminder
6. Job Complete
7. Missed Call
8. Missed Call Follow-Up
9. New Lead Response
10. Proof Ready
11. Quote Ready
12. Review Request
13. Vehicle Drop-Off
