# CLAUDE.md — USA Wrap Co Ops Platform

## Project Overview

Multi-role business operations platform for a vehicle wrap and decking company. Manages the full project lifecycle: estimates, active orders, production, installation, QC, and closing. Includes financial tracking, team workflows, customer portals, and installer coordination.

## Tech Stack

- **Framework**: Next.js 14.2.15 (App Router) with React 18
- **Language**: TypeScript 5 (strict mode OFF, build errors ignored)
- **Database / Auth / Storage / Realtime**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 3.4.1 with custom dark theme
- **Deployment**: Vercel
- **Key dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `date-fns`, `clsx`, `tailwind-merge`
- **No external UI library** — all components are custom-built with Tailwind

## Commands

```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build (TS errors ignored via next.config.js)
npm run start      # Run production build
npm run lint       # ESLint
```

## Project Structure

```
app/                        # Next.js App Router pages
  layout.tsx                # Root layout (globals.css, Providers wrapper)
  page.tsx                  # Redirects to /dashboard or /login
  login/page.tsx            # Email + Google OAuth login
  dashboard/                # Main dashboard with layout (Sidebar + TopBar)
  pipeline/                 # Kanban approval board (realtime)
  tasks/                    # Per-person task queue
  projects/[id]/            # Project detail workspace (dynamic route)
  analytics/                # Analytics dashboard (admin only)
  calendar/                 # Calendar with install dates
  design/                   # Design studio
  employees/                # Team management (admin only)
  intake/[token]/           # Customer intake portal (public, token-gated)
  inventory/                # Vinyl/material inventory
  leaderboard/              # Performance metrics
  overhead/                 # Shop overhead calculator
  production/               # Production hub
  proof/[token]/            # Design proof review (public, token-gated)
  settings/                 # Organization settings
  timeline/                 # Project timeline view
  auth/callback/route.ts    # Supabase OAuth callback handler

components/                 # Feature-organized React components
  auth/                     # LoginForm
  layout/                   # Sidebar, TopBar
  dashboard/                # DashboardClient, DashboardWrapper, NewProjectModal
  pipeline/                 # PipelineBoard, KanbanBoard, SalesPipeline, ProductionPipeline, InstallPipeline
  projects/                 # ProjectDetail
  tasks/                    # TasksClient
  approval/                 # StageApproval, SendBackModal, MaterialTracking, QuotedVsActual
  employees/                # EmployeesClient
  customer/                 # CustomerIntakePortal, CustomerProofing, IntakeLinkGenerator
  designer/                 # DesignerBidPanel
  installer/                # InstallerHub, SendBidToInstaller
  financial/                # FloatingFinancialBar
  inventory/                # InventoryClient
  analytics/                # AnalyticsClient
  chat/                     # JobChat
  shared/                   # Providers (ToastProvider), ActionMenu, Toast

lib/supabase/               # Supabase client initialization
  client.ts                 # Browser client (createBrowserClient)
  server.ts                 # Server client (createServerClient with cookies)
  middleware.ts              # Session refresh + route protection logic
  profile.ts                # normalizeProfile() helper

types/
  index.ts                  # All TypeScript types, RBAC permissions, canAccess()

sql/                        # Migration scripts
supabase_schema.sql         # Full database schema (run in Supabase SQL Editor)
middleware.ts               # Root middleware — delegates to lib/supabase/middleware
```

## Architecture Patterns

### Server vs Client Components

- **Server components** (page.tsx files): Fetch auth session and data server-side, redirect if unauthenticated, pass data as props to client components.
- **Client components** (suffixed `Client` or feature-named): Handle state, user interactions, and Supabase realtime subscriptions. Marked with `'use client'`.

### Data Fetching

- Server-side: `createClient()` from `lib/supabase/server.ts` with `.select().eq()` chains
- Client-side: `createClient()` from `lib/supabase/client.ts` via hooks
- Realtime: Supabase `channel().on('postgres_changes', ...)` for dashboard and pipeline live updates
- All queries filter by `org_id` (multi-tenant)

### State Management

- React hooks (`useState`, `useCallback`, `useMemo`, `useEffect`) — no Redux or global stores
- `ToastProvider` context for notifications
- `localStorage` for persisted filter preferences (dashboard)
- Supabase realtime for cross-device sync

### Authentication & Authorization

- **Auth flow**: Supabase Auth (email/password + Google OAuth) → session in HTTP-only cookies → middleware refreshes on each request
- **Route protection**: Middleware redirects unauthenticated users to `/login`. Public routes: `/login`, `/auth/callback`, `/intake/[token]`, `/proof/[token]`
- **RBAC**: 6 roles (`admin`, `sales`, `production`, `installer`, `designer`, `customer`) with 16 permissions defined in `types/index.ts`
- **Database RLS**: Row Level Security policies enforce access at the PostgreSQL level, independent of frontend
- **Multi-tenancy**: All data scoped by `org_id`; RLS helper functions `auth_org_id()` and `auth_role()`

### Roles & Permissions

| Role | Access Scope | Key Permissions |
|------|-------------|-----------------|
| admin | Everything | All 16 permissions |
| sales | All projects, financials, tasks | view_financials, edit_projects, sign_off_sales |
| production | All active orders, production + QC | view_all_projects, sign_off_production |
| installer | Only assigned jobs | sign_off_install |
| designer | Only explicitly assigned projects | access_design_studio |
| customer | Own projects only | Portal-only (no backend permissions) |

Use `canAccess(role, permission)` from `types/index.ts` for permission checks.

## Database

PostgreSQL via Supabase. Schema defined in `supabase_schema.sql`.

### Core Tables

- **orgs** — Multi-tenant organizations (id, name, slug, plan, settings)
- **profiles** — Users linked to `auth.users` (role, org_id, permissions JSONB)
- **projects** — Main entity (type, status, pipe_stage, financials, JSONB flexible fields)
- **project_members** — Designer access grants (project_id, user_id)
- **files** — File uploads with versioning and customer visibility control
- **tasks** — Work queue items (manual/auto/ai_suggested/reminder)
- **approvals** — Stage sign-offs (proof/install/final/deposit/custom)
- **installer_bids** / **installer_bid_recipients** / **installer_bid_responses** — Bidding workflow
- **time_blocks** — Installer time tracking
- **activity_log** — Audit trail of all changes
- **notifications** — User notifications with read status
- **customers** — Loyalty tier tracking (Bronze/Silver/Gold/Platinum)
- **payments** — Payment records with status tracking
- **customer_intake** / **design_proofs** / **proof_settings** / **designer_bids** — Sprint 2b additions

### Key JSONB Fields on Projects

- `form_data` — Flexible form input storage
- `fin_data` — Structured financials (ProjectFinancials type)
- `actuals` — Actual costs vs quoted
- `checkout` — Stage completion checklist (boolean flags)
- `installer_bid` — Bid status and rates
- `send_backs` — Rejection history array

### Project Lifecycle

**Status flow**: `estimate` → `active` → `in_production` → `install_scheduled` → `installed` → `qc` → `closing` → `closed` (or `cancelled`)

**Pipeline stages (Kanban)**: `sales_in` → `production` → `install` → `prod_review` → `sales_close` → `done`

## Styling Conventions

### Theme

Dark-only theme. Custom brand colors defined in both `tailwind.config.js` and CSS variables in `globals.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `bg` | #0d0f14 | Page background |
| `surface` | #151820 | Card/panel backgrounds |
| `surface2` | #1c202b | Elevated surfaces, inputs |
| `border` | #2a2f3d | Borders, dividers |
| `accent` | #4f7fff | Primary action color |
| `green` | #22c07a | Success, active status |
| `red` | #f25a5a | Danger, errors |
| `amber` | #f59e0b | Warnings, pending |
| `text1` | #f1f5f9 | Primary text |
| `text2` | #94a3b8 | Secondary text |
| `text3` | #475569 | Muted/label text |

### CSS Component Classes (globals.css)

Use these pre-defined classes instead of inline Tailwind for common patterns:

- `.card` — Card container (bg-surface, border, rounded-xl, p-4)
- `.btn-primary` / `.btn-ghost` / `.btn-danger` — Button variants
- `.btn-sm` / `.btn-xs` — Button sizes
- `.field` — Form input styling
- `.field-label` — Form label (uppercase, text-text3)
- `.badge-green` / `.badge-amber` / `.badge-red` / `.badge-accent` / `.badge-purple` / `.badge-cyan` / `.badge-gray` — Status badges
- `.section-label` — Section heading divider
- `.data-table` — Table styling with hover states
- `.kanban-col` — Kanban column container
- `.mono` — Monospace font for numbers
- `.anim-fade-up` / `.anim-pop-in` / `.anim-pulse-red` — Animations

### Fonts

- **Inter** — Body text (`font-sans`)
- **JetBrains Mono** — Numbers, code (`font-mono`)
- **Barlow Condensed** — Display headings (`font-display`)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server-only, keep secret)
```

## Conventions for AI Assistants

### Code Style

- TypeScript with relaxed checking (`strict: false`, build errors ignored)
- No semicolons (project uses no-semicolon style in most files)
- Single quotes for strings
- Functional components with arrow functions
- Named exports for components, default exports for pages
- `'use client'` directive at top of client components

### File Organization

- One component per file, organized by feature domain under `components/`
- Client components suffixed with `Client` (e.g., `DashboardClient.tsx`)
- Server page components are plain function names (e.g., `DashboardPage`)
- All types consolidated in `types/index.ts`

### Supabase Patterns

- Always use `createClient()` from the appropriate location:
  - `lib/supabase/server.ts` in server components and API routes
  - `lib/supabase/client.ts` in client components
- Always filter queries by `org_id` for multi-tenant safety
- Use `.select()` with specific columns and join syntax for related tables
- Leverage existing RLS policies — don't bypass with service role key unless necessary

### UI Patterns

- Use existing CSS component classes (`.card`, `.btn-primary`, `.badge-*`, `.field`, etc.)
- Follow the dark theme — never use light backgrounds or colors outside the palette
- Use Tailwind utility classes with the custom color tokens (`text-text1`, `bg-surface`, `border-border`, etc.)
- Toast notifications via `useToast()` hook for user feedback
- Modals use fixed overlay pattern with `anim-pop-in` animation

### What to Avoid

- Do not add new dependencies without clear justification — the project is deliberately minimal
- Do not introduce a UI library (shadcn, MUI, etc.) — stick with custom Tailwind components
- Do not use localStorage for auth or sensitive data — Supabase handles sessions via cookies
- Do not create API routes for operations the Supabase client SDK can handle directly
- Do not bypass RLS with the service role key in client-accessible code
