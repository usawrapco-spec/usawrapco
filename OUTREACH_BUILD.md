# Outreach System Build Report
**Date:** 2026-02-26
**Status:** BUILD PASSING ✓

---

## Audit Findings

| Component | Status | Notes |
|-----------|--------|-------|
| `app/outreach/page.tsx` | Existed (old) | Old version — Sequences/Campaigns/Templates/Activity tabs using broadcast_campaigns + sms_templates |
| `email_sequences` table | 4 rows | status='draft', sequence_type='cold_outreach' |
| `sequence_steps` | 0 rows | Empty |
| `contact_lists` | 0 rows | Empty |
| `contact_list_members` | 0 rows | Empty |
| `outreach_mailboxes` | 1 row | "Main Outreach" — shop@usawrapco.com, warmed, 100/day limit |
| `sequence_enrollments` | 0 rows | Empty |
| `sequence_step_sends` | 0 rows | Empty |
| Edge function `process-sequences` | **EXISTS** | ACTIVE, deployed |
| SideNav outreach link | Exists | Zap icon → /outreach, roles: owner/admin/sales_agent |
| Email open/click tracking routes | Missing | Created new |

---

## What Was Built

### 1. `app/outreach/page.tsx` — Full Rebuild

Complete rebuild using the actual production schema. 4 tabs:

#### TAB 1 — SEQUENCES
- List view: name, status badge (active/draft/paused), step count, enrolled, active, reply rate
- [+ New Sequence] form: name, description, goal (cold_outreach/nurture/reactivation/follow_up)
- Click sequence → Visual step builder:
  - Numbered timeline with delay chips ("Immediately" / "2d after previous")
  - Per-step: type (Email/SMS/Task), delay (days + hours fields)
  - Email: subject_a, body_a + optional A/B variants (subject_b, body_b) gated behind toggle
  - SMS: sms_body with 160-char counter
  - Task: task_title + task_note
  - Variables hint: `{{first_name}}`, `{{company}}`, `{{vehicle}}`
  - Per-step Save + Delete buttons (saves to `sequence_steps` table)
- Settings: name, status, description, stop_on_reply toggle, A/B testing toggle
- [Activate Sequence] → sets status='active'
- [Enroll Contacts] → modal listing contact_lists → inserts into sequence_enrollments

#### TAB 2 — CONTACT LISTS
- List of contact_lists with member count, source, created date
- [+ New List] form: name, description, source
- Click list → members table (name, email, company, type, status)
- [Import CSV] — browser-side parse, columns: name, email, company (email required), bulk insert
- [Add from Customers] — modal with checkbox picker, filters to customers with email
- Remove individual members
- All inserts update list.member_count

#### TAB 3 — ACTIVE CAMPAIGNS (Enrollments)
- Table of sequence_enrollments with joined sequence name
- Columns: contact, sequence, step (badge), next send, status
- "Now" indicator if next_send_at is in the past
- Status badges: replied > active/paused/completed/unsubscribed/bounced
- Filter bar: all / active / completed / paused / unsubscribed / bounced
- Per-row: Pause/Resume + Unenroll (X) buttons

#### TAB 4 — MAILBOXES
- Shows connected outreach_mailboxes (1 existing: Main Outreach)
- Per mailbox: name, from_name, email, warmup badge, active badge
- Stats grid: Sent Today, Daily Limit, Utilization %, Purpose
- [+ Add Mailbox] form: display name, from name, email, Resend domain

---

### 2. `app/api/track/open/[send_id]/route.ts` — New

- GET request returns 1×1 transparent GIF (base64 decoded)
- Updates `sequence_step_sends.opened_at = now()` WHERE `opened_at IS NULL`
- Cache-Control: no-store — prevents proxy caching
- Silent error handling — pixel always returns

### 3. `app/api/track/click/[send_id]/route.ts` — New

- GET request redirects to `?url=` query param destination
- Updates `sequence_step_sends.clicked_at = now()` WHERE `clicked_at IS NULL`
- Default redirect: https://usawrapco.com
- Silent error handling — redirect always happens

---

### 4. Supabase Migration: `enable_pg_cron_sequences`

- Enabled `pg_cron` extension
- Scheduled `process-sequences-hourly` cron job:
  - Schedule: `0 * * * *` (every hour on the hour)
  - Calls `process-sequences` edge function via `net.http_post`
  - The edge function (`process-sequences`) already existed and was ACTIVE

---

## Database Schema Used

| Table | Key Columns Used |
|-------|-----------------|
| `email_sequences` | id, org_id, name, description, status, sequence_type, enrolled_count, active_count, replied_count, ab_test_enabled, stop_on_reply, is_active |
| `sequence_steps` | id, sequence_id, step_number, step_type, delay_days, delay_hours, subject_a, body_a, subject_b, body_b, sms_body, task_title, task_note, condition_type |
| `contact_lists` | id, org_id, name, description, list_type, source, member_count |
| `contact_list_members` | id, list_id, contact_type, customer_id, email, name, company, unsubscribed |
| `sequence_enrollments` | id, sequence_id, org_id, contact_type, contact_list_member_id, email, name, company, status, current_step, next_send_at, enrolled_at, replied_at |
| `sequence_step_sends` | id, enrollment_id, step_id, opened_at, clicked_at |
| `outreach_mailboxes` | id, org_id, name, email, from_name, warmup_status, daily_send_limit, current_daily_sent, is_default, is_active, resend_from |

---

## Build Results

```
✓ Compiled successfully
npx tsc --noEmit → 0 errors
npm run build → ✓ Compiled successfully (no type errors)
```

Pre-existing errors (unrelated to outreach): **None found after full build**

---

## Sending Engine Status

The `process-sequences` edge function is **ACTIVE** in Supabase and handles:
- Querying `sequence_enrollments` where `next_send_at <= now()` and status='active'
- Sending email via Resend (`email-send` edge function) or SMS via Twilio
- Logging to `sequence_step_sends`
- Advancing `current_step` or marking enrollment complete

The hourly cron job (`process-sequences-hourly`) triggers it automatically.

---

## Tracking Integration

To enable open/click tracking when sending from the processor, embed in emails:

**Open pixel:**
```html
<img src="https://[your-domain]/api/track/open/[send_id]" width="1" height="1" />
```

**Click tracking:**
```
https://[your-domain]/api/track/click/[send_id]?url=https://destination.com
```

Both routes update `sequence_step_sends.opened_at` / `clicked_at` via authenticated Supabase server client.
