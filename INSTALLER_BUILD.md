# INSTALLER_BUILD.md — Mobile Installer Portal

## Status: COMPLETE
Build: Compiled successfully — TypeScript clean. Windows ENOENT is pre-existing non-blocking artifact.

---

## Pre-Audit Findings

### Existing installer routes
| Route | Component | Notes |
|-------|-----------|-------|
| /install | InstallDashboardClient | Manager view (owner/admin/production only) — KEPT AS IS |
| /installer-portal | InstallerPortalClient | Old portal (tabs: dashboard, bids, schedule, earnings) |
| /installer | InstallerMobilePortal (NEW) | New 6-tab mobile-first portal — THIS IS THE BUILD |

### Roles in DB: installer, owner, production, sales_agent, viewer

### Tables confirmed via Supabase MCP
| Table | Status |
|-------|--------|
| install_sessions | Exists — installer_id, project_id, started_at, ended_at, duration_seconds |
| installer_bids | Exists — installer_id, project_id, status, pay_amount, hours_budget |
| installer_time_blocks | Exists |
| time_clock_entries | Exists — user_id, clock_in, clock_out, category, job_id, location_lat/lng |
| job_comments | Exists — user_id, author_id, body, channel |
| supply_requests | CREATED via migration 20260302000000_supply_requests.sql |

---

## Files Created / Modified

### New Files
- components/installer/InstallerMobilePortal.tsx — 6-tab mobile-first portal component
- supabase/migrations/20260302000000_supply_requests.sql — supply_requests table + RLS

### Modified Files
- app/installer/page.tsx — Rebuilt with role guard + 8 parallel data fetches + new component
- components/layout/SideNav.tsx — /installer-portal link updated to /installer "My Portal"
- app/deckforge/page.tsx — Fixed pre-existing Profile type cast
- components/projects/JobDetailClient.tsx — Fixed pre-existing Project+CustomerRow intersection cast

---

## Portal Tabs

### HOME
- Greeting with today's date
- Active clock-in banner (green) with live elapsed timer + Clock Out button
- Clock In CTA when not clocked in (routes to Time Clock tab)
- This Week's Earnings from accepted installer_bids
- Active job timer widget if running (Pause/Resume/Stop)
- Today's Jobs list (install_date = today, installer_id = me)
- Coming Up list (next 7 days)

### MY JOBS
- Filter: Today / This Week / Completed / All
- Job cards: title, vehicle, date, address, stage badge
- Job detail:
  - Job Timer (Start/Pause/Resume/Stop) writes to install_sessions
  - Photo Upload (Before/During/After) writes to job_images + project-files storage
  - Add Note writes to job_comments (channel: install)
  - Send for QC Approval updates pipe_stage to prod_review

### AVAILABLE JOBS (Bid Board)
- Projects in install stage with installer_id IS NULL
- Submit Bid modal: price, hours, availability date
  - Inserts installer_bids with status=pending
- My Pending Bids section

### EARNINGS
- Period toggle: This Week / This Month / All Time
- Total earned (big green number)
- CSS bar chart (no recharts dependency)
- Job list: name, date, amount, status
- Data from installer_bids where status IN (accepted, completed)

### TIME CLOCK
- Big live timer display
- Clock In form: category, optional job link, geolocation capture
- Clock Out button
- This Week's Hours total
- Today's entries list
- Writes to time_clock_entries (user_id, clock_in, clock_out, category, job_id, location_lat/lng)

### SUPPLY REQUESTS
- Past requests with urgency badge, status, items, project link
- New Request bottom-sheet modal:
  - Link to project
  - Items table (add rows: name, qty, unit)
  - Urgency: Normal / Urgent / Emergency
  - Needed By date
  - Notes
  - Inserts to supply_requests table

---

## supply_requests Table (Migration 20260302000000)

supply_requests (
  id uuid PK,
  org_id uuid,
  project_id uuid -> projects.id (nullable),
  requested_by uuid -> profiles.id,
  status text CHECK (pending | ordered | delivered | cancelled),
  items jsonb DEFAULT [],
  urgency text CHECK (normal | urgent | emergency),
  needed_by date,
  notes text,
  approved_by uuid -> profiles.id (nullable),
  approved_at / fulfilled_at timestamptz
)

RLS Policies:
- SELECT: own rows OR owner/admin/production
- INSERT: own rows only
- UPDATE: own pending rows OR owner/admin/production

---

## Role Guard
/installer allows: owner, admin, installer
All others redirect to /dashboard.

---

## Style
- Dark theme via CSS variables throughout
- All inline styles (no Tailwind classes)
- Mobile-first sticky 6-tab bottom nav bar
- Large touch targets (min 44px height)
- Bold typography: Barlow Condensed headers, JetBrains Mono for numbers/timer
- Green = active/clocked-in state
- Bottom tab bar with active accent border-top indicator
