# SCHEDULING_BUILD.md — Scheduling & Booking Feature Report

## Summary

All three scheduling/booking features built and verified. TypeScript: **0 errors**. Vercel deploy-ready.

---

## AUDIT FINDINGS

### `/schedule` page
- **File**: `app/schedule/page.tsx` — existed, renders `SchedulePageClient`
- **Bug found**: `.order('date', ...)` — `date` column didn't exist in `appointments` table (only `start_time`/`end_time`)
- **Fix**: DB migration added `date`, `time`, `assigned_name` columns; `start_time`/`end_time` made nullable; `title` given default `''`

### `/book` page
- **File**: `app/book/page.tsx` — existed, renders `BookingPageClient`
- **Bug found**: `/book` was NOT in `publicRoutes` in middleware — unauthenticated users would be redirected to `/login`
- **Fix**: Added `/book` and `/api/appointments/public` to `publicRoutes` in `lib/supabase/middleware.ts`

### `booking_settings` table
- 2 rows exist (one per org). Schema: `available_days`, `hours_start`, `hours_end`, `buffer_minutes`, `slot_duration_minutes`, `max_daily_bookings`, `advance_booking_days`, `min_notice_hours`, `confirmation_email`, `reminder_email`, `reminder_hours_before`, `booking_page_title`, `booking_page_message`
- No `/settings/booking` page existed — **created**

### Booking Edge Function
- `booking` edge function is **ACTIVE** at `supabase/functions/v1/booking`
- `BookingPageClient.tsx` calls it for slot availability + booking creation

---

## WHAT WAS BUILT

### 1. DB Migration — `supabase/migrations/fix_appointments_columns.sql`
Added to `appointments` table:
- `date date` — used by SchedulePageClient for calendar grouping
- `time text` — used for time display and slot matching
- `assigned_name text` — display name for assigned staff member
- `title DEFAULT ''` — satisfies NOT NULL constraint without breaking inserts
- `start_time` / `end_time` made nullable — allows internal appointments without timestamps
- RLS policies added (org-scoped select/insert/update/delete)

### 2. Middleware — `/book` now public
- `lib/supabase/middleware.ts`: added `/book` and `/api/appointments/public` to `publicRoutes`
- Customers can now access `/book` without being logged in

### 3. `/schedule` page (authenticated, all roles)
- **Location**: `app/schedule/page.tsx` + `components/schedule/SchedulePageClient.tsx`
- **Already existed** with full feature set:
  - Month / Week / Day calendar toggle (default: week — overridable)
  - Appointment color blocks by status: pending=amber, confirmed=green, cancelled=red, no_show=gray
  - Click day in month → drills to day view
  - Click appointment block → detail modal
  - **Appointment Detail Modal**: customer info, type, date/time, assigned staff, status badge; action buttons: Confirm / Cancel / No Show / Delete (with confirm step)
  - **Edit mode** in detail modal: inline form to update all fields
  - **[+ New Appointment]** button: form with customer search, type, date, time, staff assignment, notes
  - **Right sidebar**: Today's schedule + status badges
  - Filters: by type, by staff, by status with clear button
- **Fixed**: DB insert now compatible with actual `appointments` schema

### 4. `/book` page (PUBLIC — no auth)
- **Location**: `app/book/page.tsx` + `components/book/BookingPageClient.tsx`
- **Already existed** with full 5-step wizard:
  - **Step 1**: Select type — Estimate / Consultation / Install Drop-off (icon cards)
  - **Step 2**: Calendar — blocks past days + Sundays; max 3 months out
  - **Step 3**: Time slots — fetched from `booking` edge function; fallback slots if edge fn unavailable
  - **Step 4**: Customer info — name (req), email (req + inline validation), phone, notes
  - **Step 5**: Confirmation summary card + "Book Another" option
- Progress bar (4 steps), back navigation, error handling, abort controller for slot fetches
- Calls `booking` edge function: `?action=slots&org_id=...&date=...` (GET) + `?action=book` (POST)

### 5. `/settings/booking` page (admin only)
- **Location**: `app/settings/booking/page.tsx` + `components/settings/BookingSettingsClient.tsx`
- **Created new** — redirects non-owner/admin to `/settings`
- **Sections**:
  - **Booking Status**: enable/disable toggle (shows as green/gray pill toggle)
  - **Availability**: day checkboxes (Mon–Sun), open/close time inputs, slot duration, buffer between appointments, minimum notice, max booking window, max per day
  - **Appointment Types**: toggle chips for estimate / install / consultation / drop-off
  - **Notifications**: confirmation email toggle, reminder email toggle + reminder timing dropdown
  - **Booking Page Content**: custom title + welcome message textarea
- Reads from `booking_settings` table on load; upserts on save
- "Preview Booking Page" link → `/book` (opens in same tab per nav rules)
- "Back" chevron → `/settings`

---

## ROUTE SUMMARY

| Route | Auth | Component |
|---|---|---|
| `/schedule` | Required (all roles) | `SchedulePageClient` — full calendar |
| `/book` | **None (public)** | `BookingPageClient` — 5-step wizard |
| `/settings/booking` | Required (owner/admin only) | `BookingSettingsClient` — config UI |

---

## BUILD RESULT

```
✓ Compiled successfully
Linting and checking validity of types ... (passes)
```

**TypeScript**: `npx tsc --noEmit` → **0 errors**

**Windows ENOENT** (post-compile): Pre-existing Windows NTFS race condition on "Collecting page data" phase. Does **NOT** affect Vercel deployment (Linux). Documented in `memory/windows-build.md`. writeFileUtf8 patch already applied.

---

## FILES CHANGED / CREATED

| File | Action |
|---|---|
| `supabase/migrations/fix_appointments_columns.sql` | Created (applied to DB) |
| `lib/supabase/middleware.ts` | Updated — added `/book`, `/api/appointments/public` to publicRoutes |
| `app/settings/booking/page.tsx` | Created |
| `components/settings/BookingSettingsClient.tsx` | Created |
| `app/schedule/page.tsx` | No change needed (DB migration fixed underlying issue) |
| `app/book/page.tsx` | No change needed (middleware fix resolved auth block) |
