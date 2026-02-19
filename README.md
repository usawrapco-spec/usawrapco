# USA Wrap Co — Ops Platform

Next.js 14 + Supabase + Vercel. Full multi-role ops system.

---

## Deploy in 5 Steps

### Step 1 — Run the database schema

Open Supabase → SQL Editor → paste the entire contents of `supabase_schema.sql` → Run.

This creates all tables, indexes, RLS policies, and triggers.

### Step 2 — Create your first user

1. In Supabase → Authentication → Users → "Invite user" (or have them sign up via email)
2. Copy the user's UUID from the Users list
3. In SQL Editor, run:

```sql
insert into profiles (id, org_id, role, name, email) values
  ('PASTE-UUID-HERE', '00000000-0000-0000-0000-000000000001',
   'admin', 'Your Name', 'you@example.com');
```

### Step 3 — Set up Supabase Storage

In Supabase → Storage → Create bucket:
- Name: `project-files`
- Public: OFF (private)

### Step 4 — Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=      # Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Settings → API → anon public key
SUPABASE_SERVICE_ROLE_KEY=     # Settings → API → service_role key (keep secret)
```

For Vercel: add these same variables in Project → Settings → Environment Variables.

### Step 5 — Deploy

```bash
npm install
npm run dev        # test locally first

# Deploy to Vercel:
npx vercel         # follow prompts
# or push to GitHub and connect repo in vercel.com
```

---

## Role Reference

| Role       | What they see |
|------------|---------------|
| admin      | Everything — all projects, analytics, settings, financials |
| sales      | All projects, financials for their deals, tasks |
| production | All active orders, production + QC stages |
| installer  | Only their assigned jobs at install stage |
| designer   | Only design projects they are explicitly assigned to |
| customer   | Only their own projects + files/approvals |

---

## Adding team members

After someone signs up, run in SQL Editor:

```sql
insert into profiles (id, org_id, role, name, email) values
  ('THEIR-AUTH-UUID', '00000000-0000-0000-0000-000000000001',
   'sales', 'Jane Smith', 'jane@usawrapco.com');
```

Or use the Employees page (admin only) to manage roles in the UI.

---

## File Structure

```
app/
  login/            Login page
  dashboard/        Main dashboard (server component, role-scoped data)
  pipeline/         Kanban approval board
  tasks/            Per-person task queue
  projects/[id]/    Project detail workspace
  auth/callback/    Supabase auth redirect handler

components/
  auth/             LoginForm
  layout/           Sidebar, TopBar
  dashboard/        DashboardClient, NewProjectModal
  pipeline/         PipelineBoard
  tasks/            TasksClient
  projects/         ProjectDetail

lib/supabase/
  client.ts         Browser client
  server.ts         Server component client
  middleware.ts     Session refresh + route protection

types/
  index.ts          All TypeScript types + ROLE_PERMISSIONS + canAccess()

middleware.ts       Protects all routes — redirects to /login if not authed
supabase_schema.sql Run this in Supabase SQL Editor
```

---

## What's built

- ✅ Supabase Auth (email/password) — no localStorage
- ✅ Role-gated sidebar — each role sees only their menu items
- ✅ Dashboard — loads projects from Supabase, syncs across devices
- ✅ Pipeline board — Kanban with stage advancement saved to DB
- ✅ Task queue — per-person ordered workflow with guide
- ✅ Project detail — editable workspace with financials, pipeline, notes
- ✅ New project modal — creates in Supabase immediately
- ✅ Full RLS policies — DB enforces access even if frontend is bypassed

## What's next (Phase 2)

- Design Studio (file upload + annotation canvas)
- Installer time tracking widget
- Installer bid system with group recipients
- Customer portal login
- PDF export (clean version)
- Analytics page (admin only)
