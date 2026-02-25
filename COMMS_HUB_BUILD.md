# Communication Hub Build Report

## Overview
Full 3-column Communication Hub (Gmail/GoHighLevel style) with email tracking, photo picker, and real-time updates.

## Files Created

### API Routes
| File | Purpose |
|------|---------|
| `app/api/inbox/send/route.ts` | Send email/SMS/notes via SendGrid with tracking, creates conversations + messages |
| `app/api/email/webhook/route.ts` | SendGrid event webhook (no auth) — handles delivered, open, click, bounce, spam |

### Components
| File | Purpose |
|------|---------|
| `components/comms/types.ts` | TypeScript interfaces for Conversation, ConversationMessage, EmailTemplate, PhotoSelection + helpers |
| `components/comms/CommHubClient.tsx` | Main 3-column layout orchestrator — state management, real-time subscriptions, filtering |
| `components/comms/ConversationList.tsx` | Column 1 — search, filter tabs (All/Email/SMS/Unread/Mine), conversation rows with avatars + badges |
| `components/comms/MessageThread.tsx` | Column 2 — message bubbles (email/SMS/note), read receipts, expand/collapse HTML emails |
| `components/comms/ComposeArea.tsx` | Compose section — Email/SMS/Note tabs, subject, body, photo picker, template selector |
| `components/comms/ContactPanel.tsx` | Column 3 — contact card, linked project, tags, sent email history with open/click stats |
| `components/comms/PhotoPickerModal.tsx` | Photo picker modal — project + category filters, grid selection, captions, multi-select |
| `components/settings/EmailSettingsClient.tsx` | Email settings — webhook URL copy, sender details, template CRUD manager |

### Pages
| File | Purpose |
|------|---------|
| `app/inbox/page.tsx` | Communication Hub server page (replaced AI Broker page) |
| `app/inbox/[conversationId]/page.tsx` | Direct conversation deep-link |
| `app/settings/email/page.tsx` | Email settings page (server wrapper) |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/20260225_email_templates_seed.sql` | Seeds 6 default email templates |

## Files Modified
| File | Change |
|------|--------|
| `components/layout/Sidebar.tsx` | Renamed "AI Broker" → "Inbox", removed "Messages", added "Email" to Settings children |
| `components/layout/MobileNav.tsx` | Renamed "Chat" → "Inbox" in more menu |

## Features

### Communication Hub (/inbox)
- **3-column layout**: Conversation list (280px) | Message thread (flex) | Contact panel (320px, collapsible)
- **Search & filter**: Search by name/email/preview, filter by All/Email/SMS/Unread/Mine
- **Message bubbles**: Outbound (right, blue), Inbound (left, gray), Notes (center, amber dashed)
- **Email messages**: Subject header, expandable body, read receipts with open count + timestamps
- **SMS messages**: Bubble style with character count (160 chars/segment)
- **Internal notes**: Yellow-tinted, not sent to customer
- **New conversation**: Create new conversations with To/Name fields
- **Real-time updates**: Supabase postgres_changes subscription on conversations + messages
- **Loading skeletons**: Skeleton loaders while fetching
- **Mobile responsive**: Conversation list ↔ thread swipe, back button

### Email Sending
- SendGrid integration with open + click tracking enabled
- Professional HTML email template with USA Wrap Co branding
- Photo gallery insertion (responsive 2-col grid with full-size links)
- Falls back to logging if SendGrid not configured

### Email Tracking
- SendGrid webhook at `/api/email/webhook` (POST, no JWT)
- Handles: delivered, open, click, bounce, spamreport
- Updates email_logs and email_events tables
- Updates conversation_messages with opened_at, open_count, clicked_at
- Real-time broadcast to inbox via Supabase subscription

### Photo Picker
- Full-screen modal (80vw × 80vh)
- Filter by project and category (before/after/general/design/production)
- Grid selection with checkmark overlay
- Per-photo captions
- Multi-select with count display
- Inserts into email as responsive gallery grid

### Email Templates (6 defaults)
1. Estimate Ready
2. Invoice
3. Proof Ready
4. Job Complete
5. Follow Up
6. Review Request

### Email Settings (/settings/email)
- SendGrid webhook URL display with copy button
- Sender details (read-only, managed in SendGrid)
- Template manager with full CRUD

## Database Tables Used
- `conversations` — conversation threads
- `conversation_messages` — individual messages
- `email_logs` — email send tracking
- `email_events` — SendGrid webhook events
- `email_photo_selections` — photos attached to emails
- `email_templates` — reusable email templates
- `job_images` — project photos for picker
- `projects` — linked projects
- `profiles` — user profiles

## ENV Vars Required
- `SENDGRID_API_KEY` — SendGrid API key for sending
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (for webhook)
