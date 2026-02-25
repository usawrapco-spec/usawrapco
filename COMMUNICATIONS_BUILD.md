# Communications Module Build Report
**Version:** 1.0
**Date:** 2026-02-24
**Branch:** ai-mode
**Build status:** PASSING

---

## Summary

Built a complete unified communications system — SMS, calls, and email — integrated into WrapShop Pro. All messages are logged to Supabase and tied to customers and projects. Staff can text/call/email from within the app; inbound replies route back in automatically via Twilio webhook.

---

## Files Created

### SQL Migration
| File | Description |
|------|-------------|
| `sql/add_communications.sql` | Creates `communications` + `sms_templates` tables, RLS policies, indexes, seeds 6 default templates |

### API Routes (all new — no existing routes modified)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/comms/sms/send` | POST | Send SMS via Twilio REST API, log to DB |
| `/api/comms/sms/webhook` | POST | Twilio inbound SMS webhook — logs replies, matches customer by phone |
| `/api/comms/email/send` | POST | Send email via Resend REST API, log to DB |
| `/api/comms/call/initiate` | POST | Initiate outbound call via Twilio, log to DB |
| `/api/comms/call/twiml` | POST/GET | TwiML instruction endpoint Twilio fetches on call connect |
| `/api/comms/call/webhook` | POST | Twilio call status callback — updates duration + status |

### UI Components
| File | Description |
|------|-------------|
| `components/comms/CommsClient.tsx` | Main hub: left panel (conv list), right panel (thread), realtime subscription, quick reply bar |
| `components/comms/ConversationThread.tsx` | Renders SMS/call/email messages chronologically with bubble styling |
| `components/comms/ComposeModal.tsx` | New message modal: customer search, channel toggle, template picker with variable substitution |
| `components/comms/CustomerCommsPanel.tsx` | Collapsible panel added to ProjectDetail chat tab — last 10 messages + inline send |

### Pages
| Route | Description |
|-------|-------------|
| `/comms` | Full communications hub — server page with TopNav |

---

## Existing Files Modified (minimal, non-breaking)

| File | Change |
|------|--------|
| `components/layout/TopNav.tsx` | Added `MessageSquare` icon import + `/comms` entry in `MORE_NAV` array |
| `components/projects/ProjectDetail.tsx` | Added `CustomerCommsPanel` import + rendered inside chat tab below Job Photos section |

---

## Database

### `communications` table
```
id, org_id, customer_id, project_id
direction: 'outbound' | 'inbound'
channel: 'sms' | 'call' | 'email'
body, subject (email only)
to_number, from_number, to_email, from_email
status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
twilio_sid, resend_id
call_duration_seconds, call_recording_url
sent_by (profiles ref)
created_at
```
Indexes on `(customer_id, created_at DESC)`, `(project_id, created_at DESC)`, `(org_id, created_at DESC)`

### `sms_templates` table
```
id, org_id, name, body, category, created_at
```
Seeded with 6 templates: Estimate Ready, Job Started Production, Install Scheduled, Vehicle Ready for Pickup, Follow Up, Appointment Reminder

---

## Environment Variables Required

Add to `.env.local` and Vercel project settings:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=noreply@usawrapco.com
```

---

## Twilio Dashboard Configuration

After deploying to Vercel, configure these in the Twilio console:

1. Go to **Phone Numbers** → your number → **Messaging**
   - Webhook URL: `https://your-domain.com/api/comms/sms/webhook`
   - Method: **HTTP POST**

2. Go to **Phone Numbers** → your number → **Voice**
   - Call comes in URL: `https://your-domain.com/api/comms/call/twiml`
   - Status callback URL: `https://your-domain.com/api/comms/call/webhook`
   - Method: **HTTP POST**

---

## Features Implemented

### CommsClient (`/comms`)
- Left panel: conversation list grouped by customer, last message preview, unread badge, timestamp
- Right panel: full conversation thread with channel-appropriate bubble styling
- Real-time updates via Supabase postgres_changes subscription
- Channel filter tabs: All / SMS / Email / Calls
- Search by customer name, phone, email, message content
- Quick reply bar (Enter to send, Shift+Enter for new line)
- "New Message" compose button

### ComposeModal
- Customer search with live dropdown
- Channel toggle: SMS or Email
- Auto-fills phone/email from selected customer
- Template picker with `{{customer_name}}`, `{{vehicle}}`, `{{estimate_link}}` variable substitution
- Character counter + segment count for SMS
- Email subject + body fields

### ConversationThread
- SMS: left/right aligned bubbles (inbound=blue, outbound=gray)
- Calls: centered timeline pill with duration + recording link
- Emails: card with subject + collapsed body
- Status icons: delivered checkmark, failed alert, pending clock
- Auto-scrolls to latest message

### CustomerCommsPanel (in ProjectDetail)
- Collapsible accordion in chat tab
- Shows last 10 messages for the project's customer
- Inline SMS and email compose with Send button
- Click-to-call button (confirm dialog)
- "View all" link → navigates to `/comms`

### API Design
- All endpoints use `@/lib/supabase/server` (matches project pattern — not auth-helpers)
- Twilio and Resend calls use fetch (no SDK dependency issues)
- Demo mode: if env vars not set, messages log to DB without actual send
- Inbound SMS webhook: matches customer by phone number, falls back to last outbound SMS recipient

---

## Test Command

```bash
# Test SMS send (requires Twilio env vars + auth session)
curl -X POST http://localhost:3000/api/comms/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1YOUR_PHONE", "body": "Test from WrapShop Pro!"}'
```

---

## What This Unlocks

- Staff can text/call/email customers from inside the app — no personal phones needed
- All communications permanently logged with customer and job context
- Inbound replies automatically appear in the inbox
- Templates eliminate typing the same messages repeatedly
- Full communication history on every customer and project record
- Real-time inbox shows unread counts
