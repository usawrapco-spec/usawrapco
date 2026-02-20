# USA WRAP CO — WrapShop Pro: Complete Build Specification for Claude Code

> **PASTE THIS ENTIRE FILE INTO CLAUDE CODE AS YOUR BUILD INSTRUCTIONS.**
> Read top-to-bottom before writing any code. Every section is interconnected.
> Build in the order specified in Section 33 (Implementation Order).
> The database schema feeds everything — do not skip it.

---

## TABLE OF CONTENTS

1. Project Identity & Business Context
2. Tech Stack & Architecture
3. File Structure
4. Environment Variables
5. Database Schema (Complete Supabase SQL)
6. Authentication & Auto-Account Creation (Bug Fix)
7. Profiles, Roles & Permissions
8. App Shell & Navigation — CRITICAL UX RULES
9. Dashboard — Command Center
10. Role-Based Employee Dashboards
11. Sales Pipeline
12. Onboarding Links (Customer Intake)
13. Job Projects — Full Lifecycle
14. Customer Expenses (Quick-Add in Jobs)
15. Design Studio — Bidirectional with Jobs
16. Internal AI Mockup Tool
17. Media Library (Photo Storage + AI Tags + Similar Search)
18. Commission & Cross-Referral Engine
19. Installer Bid System
20. Reports & Document Generation (Matching PDF Format)
21. Production Brief & Customer Sign-Off Workflow
22. Material Inventory, Waste & Remnant Tracking
23. Print Production & Scheduling
24. Printer Maintenance System
25. Timeline Manager (with Print Times)
26. AI Genie Assistant
27. Gamification System
28. Sales Velocity & AI Forecasting
29. Settings & Admin (PIN-Locked Section)
30. Customer-Facing Portal
31. API Routes — Complete Reference
32. Deployment
33. Implementation Order
34. Critical Bug Fixes From Previous Build
35. Logical Flow Verification

---

## 1. PROJECT IDENTITY & BUSINESS CONTEXT

**Company:** USA WRAP CO
**App Name:** WrapShop Pro
**Tagline:** "Your shop, gamified."

### What This App Does

All-in-one shop management for a vehicle wrap + deck coating business. Full lifecycle:

```
Lead Capture → Sales Pipeline → Customer Intake (onboarding link) → Design →
Production Brief → Customer Sign-Off → Print Scheduling → Material Pull →
Installer Bid → Installation → Time Logging → Quality Check → Invoicing → Follow-Up
```

An AI assistant (the "Genie") is woven into every screen — it pops up proactively with tips, automation offers, and communication drafts.

### Two Separate User Surfaces

| Surface | Route Group | Description |
|---------|-------------|-------------|
| **Internal App** | `(app)/...` | Shop team: owner, agents, designers, production, installers. Has PERSISTENT sidebar that NEVER disappears. |
| **Customer Portal** | `(portal)/...` | Public onboarding: submit brand materials, pre-design, pay, track job, sign off on production brief. Clean layout, no sidebar. |

### Business Divisions

| Division | Work Types |
|----------|-----------|
| **Wraps** | Vehicle wraps — vans, trucks, cars, fleets, boats, trailers |
| **Decking** | Deck coatings, surface treatments, patio, garage floors |

Both divisions share the platform. Agents can refer cross-division and earn commission (default 2.5%, configurable in Settings).

### Key Personnel (from PDF reference)

- **Owner/Admin** — Full access, all financials, settings
- **Sales Agents** — Sell jobs, send onboarding links, earn commission on gross profit (e.g., Inbound 4.5% GP)
- **Production Manager (Josh)** — Manages production, print scheduling, material. Earns production bonus: 5% of profit minus design fee
- **Designers** — Create/revise designs in Design Studio
- **Installers** — Bid on jobs, log hours, sign material acceptance & liability agreements

### Core Philosophy — GAMIFY EVERYTHING

- Every meaningful action earns XP (lead created = 10 XP, deal closed = 100 XP, job completed = 75 XP, design approved = 30 XP, etc.)
- Levels 1–50, daily login streaks, achievement badges, live leaderboard
- Dashboard = command center / game HUD, not a spreadsheet
- AI Genie pops up proactively with tips, nudges, automation offers
- Visual feedback everywhere: progress bars, confetti on level-up, streak fire icons, "+25 XP" toasts
- Competitive but collaborative: team monthly goals alongside individual scores
- Money flow is KING — every role sees their earnings front and center

---

## 2. TECH STACK & ARCHITECTURE

```
Framework:       Next.js 14+ (App Router — NOT Pages Router)
Language:        TypeScript (strict mode)
Database:        Supabase (PostgreSQL + Auth + Storage + Realtime)
Auth:            Supabase Auth (Google OAuth + Email/Password)
Payments:        Stripe (Checkout Sessions + Webhooks)
AI (fast):       claude-sonnet-4-20250514  — Genie chat, quick suggestions, similar photo search
AI (deep):       claude-opus-4-6           — Brand analysis, pricing engine, forecasting, design QA
Image Gen:       Replicate API (flux-pro model)
Styling:         Tailwind CSS 4
UI Components:   shadcn/ui (CLI-installed)
Icons:           Lucide React
State:           Zustand (global client state) + React Context (auth/user)
Forms:           React Hook Form + Zod validation
Tables:          TanStack Table v8
Charts:          Recharts
PDF Generation:  @react-pdf/renderer
Design Canvas:   Fabric.js 6
Dates:           date-fns
Signatures:      react-signature-canvas (for installer sign-off)
Deployment:      Vercel
```

### Architecture Rules

1. **App Router ONLY** — No `pages/` directory. Everything under `app/`.
2. **Route Groups** — `(app)` internal, `(portal)` customer-facing, `(auth)` login/signup.
3. **PERSISTENT APP SHELL** — `(app)/layout.tsx` renders Sidebar + Topbar + Genie FAB. ALL internal pages are `{children}` inside this shell. The sidebar NEVER unmounts or disappears on any navigation. This is the #1 UX fix from the previous build.
4. **Server Components by default** — `"use client"` only for interactivity (forms, canvases, charts, real-time subscriptions).
5. **API Routes** under `app/api/...` using `route.ts` files (App Router convention, NOT `handler` exports).
6. **Row-Level Security (RLS)** on all Supabase tables. Service role key used ONLY in server-side API routes.
7. **Realtime subscriptions** for dashboard live updates, Genie notifications, installer bid alerts, print status changes.
8. **Optimistic UI** — Mutations update local state immediately, sync with server in background.

---

## 3. FILE STRUCTURE

```
wrapshop-pro/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx                     # Centered card layout, no sidebar
│   │
│   ├── (app)/
│   │   ├── layout.tsx                     # ★ PERSISTENT APP SHELL
│   │   ├── dashboard/page.tsx             # Command center HUD
│   │   ├── sales/
│   │   │   ├── page.tsx                   # Pipeline — onboarding link generator at TOP
│   │   │   └── [leadId]/page.tsx          # Lead detail (INSIDE app shell)
│   │   ├── jobs/
│   │   │   ├── page.tsx                   # All jobs list/grid
│   │   │   └── [jobId]/
│   │   │       ├── page.tsx               # Job overview
│   │   │       ├── design/page.tsx        # Linked design tab
│   │   │       ├── production/page.tsx    # Production brief + sign-off
│   │   │       ├── expenses/page.tsx      # ★ Customer expenses quick-add
│   │   │       ├── installer/page.tsx     # Installer work order
│   │   │       ├── timeline/page.tsx      # Timeline + print scheduling
│   │   │       └── materials/page.tsx     # Material pull sheet
│   │   ├── design-studio/
│   │   │   ├── page.tsx                   # All designs grid
│   │   │   └── [designId]/page.tsx        # Fabric.js canvas (INSIDE app shell)
│   │   ├── mockup-tool/page.tsx           # ★ Internal AI mockup generator
│   │   ├── media/page.tsx                 # ★ Media library
│   │   ├── customers/
│   │   │   ├── page.tsx                   # Customer list
│   │   │   └── [customerId]/page.tsx      # Detail + their uploaded files
│   │   ├── production/
│   │   │   ├── page.tsx                   # Production queue overview
│   │   │   ├── print-schedule/page.tsx    # ★ Print scheduling calendar
│   │   │   └── printer/page.tsx           # ★ Printer maintenance
│   │   ├── inventory/
│   │   │   ├── page.tsx                   # ★ Material inventory (rolls, lamination)
│   │   │   └── remnants/page.tsx          # ★ Usable remnant/leftover pieces
│   │   ├── installer-bids/page.tsx        # ★ Bid board
│   │   ├── reports/page.tsx               # Reports hub (all departments)
│   │   ├── leaderboard/page.tsx           # Gamification leaderboard
│   │   └── settings/
│   │       ├── page.tsx                   # General
│   │       ├── defaults/page.tsx          # ★ Default values (PIN-locked)
│   │       ├── shop-expenses/page.tsx     # ★ Shop overhead (PIN-locked)
│   │       ├── commissions/page.tsx       # ★ Commission rules (PIN-locked)
│   │       ├── pricing-rules/page.tsx     # Pricing formulas
│   │       ├── team/page.tsx              # Team + role management
│   │       ├── gamification/page.tsx      # XP values, levels
│   │       └── integrations/page.tsx      # API keys
│   │
│   ├── (portal)/
│   │   ├── layout.tsx                     # Clean public layout, no sidebar
│   │   ├── [token]/page.tsx               # Customer intake form
│   │   ├── [token]/design/page.tsx        # Customer design canvas
│   │   ├── [token]/signoff/page.tsx       # ★ Production sign-off
│   │   └── [token]/status/page.tsx        # Job tracking
│   │
│   ├── api/
│   │   ├── ai/
│   │   │   ├── analyze-brand/route.ts
│   │   │   ├── calculate-pricing/route.ts
│   │   │   ├── design-feedback/route.ts
│   │   │   ├── generate-mockup/route.ts
│   │   │   ├── genie-chat/route.ts
│   │   │   ├── genie-suggestion/route.ts
│   │   │   ├── sales-forecast/route.ts
│   │   │   ├── similar-photos/route.ts
│   │   │   └── material-match/route.ts
│   │   ├── payments/
│   │   │   ├── create-checkout/route.ts
│   │   │   └── webhook/route.ts
│   │   ├── reports/
│   │   │   ├── sales-order/route.ts
│   │   │   ├── production-brief/route.ts
│   │   │   └── installer-work-order/route.ts
│   │   ├── media/
│   │   │   └── upload/route.ts
│   │   └── inventory/
│   │       ├── consume-roll/route.ts
│   │       └── match-remnant/route.ts
│   │
│   ├── layout.tsx                          # Root layout
│   └── globals.css
│
├── components/
│   ├── app-shell/
│   │   ├── Sidebar.tsx                    # ★ NEVER unmounts
│   │   ├── Topbar.tsx
│   │   ├── SidebarNav.tsx
│   │   └── UserMenu.tsx
│   ├── genie/
│   │   ├── GenieFAB.tsx                   # Floating button (always visible)
│   │   ├── GenieChatDrawer.tsx            # Expandable chat panel
│   │   ├── GenieInlineSuggestion.tsx      # Contextual popups throughout app
│   │   └── GenieProvider.tsx              # State provider
│   ├── gamification/
│   │   ├── XPToast.tsx
│   │   ├── LevelUpCelebration.tsx
│   │   ├── StreakBadge.tsx
│   │   ├── LeaderboardTable.tsx
│   │   └── XPProgressBar.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── JobStatusCard.tsx              # ★ Inline action row, not dropdown
│   │   ├── VelocityGauge.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── EarningsWidget.tsx             # Per-role money display
│   │   └── ActivityFeed.tsx
│   ├── sales/
│   │   ├── PipelineBoard.tsx
│   │   ├── LeadCard.tsx
│   │   └── OnboardingLinkGenerator.tsx    # ★ Positioned at TOP of sales page
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── CustomerExpenseQuickAdd.tsx
│   │   └── ProductionBriefViewer.tsx
│   ├── design/
│   │   ├── DesignCanvas.tsx               # Fabric.js wrapper
│   │   ├── DesignBriefPanel.tsx
│   │   └── DesignJobLinker.tsx            # Bidirectional link
│   ├── media/
│   │   ├── MediaGrid.tsx
│   │   ├── MediaUploader.tsx
│   │   ├── TagEditor.tsx
│   │   └── SimilarPhotosPanel.tsx         # AI-powered recommendations
│   ├── inventory/
│   │   ├── RollTracker.tsx
│   │   ├── RemnantCard.tsx
│   │   ├── ConsumeRollModal.tsx
│   │   └── WasteLogger.tsx
│   ├── print/
│   │   ├── PrintScheduleCalendar.tsx
│   │   ├── PrintJobCard.tsx
│   │   └── PrinterStatusWidget.tsx
│   ├── printer-maintenance/
│   │   ├── MaintenanceLog.tsx
│   │   ├── MaintenanceSchedule.tsx
│   │   └── PrinterHealthCard.tsx
│   ├── reports/
│   │   ├── SalesOrderPDF.tsx              # Matches page 1 of PDF
│   │   ├── ProductionBriefPDF.tsx         # Matches page 2 of PDF
│   │   ├── InstallerWorkOrderPDF.tsx      # Matches pages 3–4 of PDF
│   │   └── CustomerReportPDF.tsx
│   ├── installer/
│   │   ├── BidBoard.tsx
│   │   ├── BidCard.tsx
│   │   ├── TimeLogger.tsx
│   │   └── LiabilitySignatureForm.tsx     # Signature pad + checklist
│   └── ui/                                # shadcn (auto-generated)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      # Browser client
│   │   ├── server.ts                      # Server component client
│   │   ├── service.ts                     # Service role (API routes only)
│   │   └── middleware.ts
│   ├── anthropic.ts                       # Claude client wrapper
│   ├── stripe.ts
│   ├── replicate.ts
│   ├── gamification.ts                    # XP awarding functions
│   ├── permissions.ts                     # RBAC helpers
│   ├── commission.ts                      # Commission calc engine
│   ├── pricing-engine.ts                  # Deterministic pricing (backup to AI)
│   ├── pdf-templates.ts                   # Shared PDF layout helpers
│   └── constants.ts                       # XP values, status lists, defaults
│
├── stores/
│   ├── useAuthStore.ts
│   ├── useGenieStore.ts
│   ├── useDashboardStore.ts
│   └── useInventoryStore.ts
│
├── types/
│   ├── database.ts                        # Generated from Supabase schema
│   ├── api.ts
│   └── genie.ts
│
├── middleware.ts                           # Route protection
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 4. ENVIRONMENT VARIABLES

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Replicate (AI image generation)
REPLICATE_API_TOKEN=r8_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. DATABASE SCHEMA

**Run this entire block in the Supabase SQL Editor.** It creates every table, enum, function, trigger, and RLS policy the system needs.

```sql
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'owner',          -- Full access to everything including billing
  'admin',          -- Full access minus billing/danger-zone
  'sales_agent',    -- Sales pipeline, leads, commissions, customer comms
  'designer',       -- Design studio, mockups, design assignments
  'production',     -- Production briefs, print scheduling, material inventory, printer maintenance
  'installer',      -- Bid board, work orders, time logging, liability sign-off
  'viewer'          -- Read-only dashboard
);

CREATE TYPE division_type AS ENUM ('wraps', 'decking', 'both');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE lead_source AS ENUM (
  'inbound', 'outbound', 'referral', 'walk_in', 'repeat', 'cross_referral'
);

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'proposal_sent',
  'negotiating', 'won', 'lost', 'on_hold'
);

CREATE TYPE job_status AS ENUM (
  'intake',            -- Initial info gathering
  'design',            -- Design in progress
  'revision',          -- Design revision requested
  'pending_signoff',   -- Awaiting customer approval of production brief
  'approved',          -- Customer approved, ready for production
  'print_queue',       -- In print queue
  'printing',          -- Currently printing
  'printed',           -- Printed, ready for install scheduling
  'bid_open',          -- Open for installer bids
  'scheduled',         -- Install date set
  'in_progress',       -- Installation underway
  'quality_check',     -- Post-install QC
  'completed',         -- Done
  'invoiced',          -- Invoice sent
  'paid',              -- Payment received
  'cancelled'
);

CREATE TYPE design_status AS ENUM (
  'brief',              -- Brief created, not started
  'in_progress',        -- Designer working on it
  'internal_review',    -- Team reviewing
  'client_review',      -- Customer reviewing
  'revision_requested', -- Needs changes
  'approved',           -- Approved by customer
  'production_ready'    -- Files prepped for print
);

CREATE TYPE expense_category AS ENUM (
  'material', 'labor', 'subcontractor', 'equipment',
  'travel', 'design_fee', 'rush_fee', 'customer_expense', 'misc'
);

CREATE TYPE bid_status AS ENUM ('open', 'submitted', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE print_job_status AS ENUM ('queued', 'prepping', 'printing', 'drying', 'laminating', 'done', 'failed', 'reprinting');
CREATE TYPE maintenance_type AS ENUM ('scheduled', 'unscheduled', 'cleaning', 'repair', 'calibration', 'head_replacement', 'nozzle_check');
CREATE TYPE roll_status AS ENUM ('in_stock', 'in_use', 'consumed', 'defective');
CREATE TYPE remnant_status AS ENUM ('available', 'reserved', 'consumed');
CREATE TYPE signoff_status AS ENUM ('pending', 'sent', 'viewed', 'approved', 'rejected');
CREATE TYPE shop_expense_category AS ENUM (
  'rent', 'utilities', 'insurance', 'equipment_lease', 'software',
  'marketing', 'vehicle', 'supplies', 'payroll_overhead', 'misc'
);

-- ============================================================
-- 5A. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  division division_type NOT NULL DEFAULT 'both',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(8,2),                 -- for installers / hourly workers
  commission_rate_override DECIMAL(5,4),    -- NULL = use source default from settings

  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  badges JSONB DEFAULT '[]'::jsonb,
  monthly_xp INTEGER DEFAULT 0,
  weekly_xp INTEGER DEFAULT 0,

  -- Preferences
  notification_prefs JSONB DEFAULT '{"email":true,"push":true,"genie_tips":true}'::jsonb,
  dashboard_layout JSONB,
  pin_hash TEXT,                            -- for PIN-locked settings access

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ★ FIX: Auto-create profile on ANY new auth user (Google OAuth, email, etc.)
-- This eliminates the "no account available" bug.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    ),
    'viewer'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5B. CUSTOMERS (external clients)
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  company_name TEXT,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  source lead_source DEFAULT 'inbound',
  auth_user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5C. LEADS / SALES PIPELINE
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id),
  division division_type NOT NULL DEFAULT 'wraps',
  status lead_status NOT NULL DEFAULT 'new',
  priority priority_level DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  estimated_value DECIMAL(10,2) DEFAULT 0,

  -- Source & commission
  source lead_source NOT NULL DEFAULT 'inbound',
  source_commission_rate DECIMAL(5,4) DEFAULT 0.045,

  -- Onboarding link
  onboarding_link_id UUID,
  onboarding_link_sent_at TIMESTAMPTZ,

  -- Cross-referral (wraps ↔ decking)
  referred_by UUID REFERENCES profiles(id),
  referral_from_division division_type,
  cross_referral_rate DECIMAL(5,4) DEFAULT 0.025,
  cross_referral_paid BOOLEAN DEFAULT false,

  -- Dates
  follow_up_date DATE,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,

  xp_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate WQ- ref numbers
CREATE OR REPLACE FUNCTION generate_lead_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_number IS NULL OR NEW.ref_number = '' THEN
    NEW.ref_number := 'WQ-' || lpad(floor(random() * 9999999999)::bigint::text, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lead_ref
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION generate_lead_ref();

-- ============================================================
-- 5D. ONBOARDING LINKS (shareable customer intake forms)
-- ============================================================
CREATE TABLE onboarding_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  welcome_message TEXT DEFAULT 'Welcome! Let''s get your project started.',
  include_design_canvas BOOLEAN DEFAULT true,
  require_payment BOOLEAN DEFAULT true,
  payment_amount INTEGER DEFAULT 25000,
  views INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN DEFAULT true,
  submission_data JSONB,
  uploaded_file_ids JSONB DEFAULT '[]'::jsonb,
  payment_status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5E. JOBS (core work unit)
-- ============================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number TEXT,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),
  assigned_to UUID REFERENCES profiles(id),
  production_manager UUID REFERENCES profiles(id),
  division division_type NOT NULL DEFAULT 'wraps',
  status job_status NOT NULL DEFAULT 'intake',
  priority priority_level DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,

  -- Vehicle / project details
  vehicle_type TEXT,
  vehicle_year TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  vehicle_vin TEXT,
  wrap_type TEXT DEFAULT 'Full Wrap',
  coverage_percent INTEGER DEFAULT 100,
  material_type TEXT DEFAULT 'Avery MPI 1105',
  lamination_type TEXT DEFAULT 'Avery DOL 1460',
  material_rate DECIMAL(6,2) DEFAULT 2.10,

  -- Panel breakdown (array of panels with dimensions + sqft)
  panels JSONB DEFAULT '[]'::jsonb,
  total_sqft DECIMAL(10,2) DEFAULT 0,

  -- Scope of work
  wrap_areas TEXT DEFAULT 'Full vehicle wrap',
  exclusion_areas TEXT DEFAULT 'None specified',
  design_required BOOLEAN DEFAULT true,

  -- Financial (matches PDF Sales Order format)
  material_cost DECIMAL(10,2) DEFAULT 0,
  install_labor_cost DECIMAL(10,2) DEFAULT 0,
  install_hours_budgeted DECIMAL(6,2) DEFAULT 0,
  design_fee DECIMAL(10,2) DEFAULT 0,
  additional_fees DECIMAL(10,2) DEFAULT 0,
  total_sale DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  gross_profit_margin DECIMAL(5,2) DEFAULT 0,
  ai_pricing JSONB,

  -- Commission (calculated)
  agent_commission DECIMAL(10,2) DEFAULT 0,
  cross_referral_commission DECIMAL(10,2) DEFAULT 0,
  production_bonus DECIMAL(10,2) DEFAULT 0,

  -- Installer
  installer_id UUID REFERENCES profiles(id),
  installer_pay DECIMAL(10,2) DEFAULT 0,
  installer_billing_rate DECIMAL(8,2) DEFAULT 35.00,
  vehicle_access_notes TEXT,

  -- Design link (bidirectional)
  active_design_id UUID,

  -- Timeline
  timeline_type TEXT DEFAULT 'standard',
  scheduled_start DATE,
  scheduled_end DATE,
  install_date DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Print scheduling
  print_start TIMESTAMPTZ,
  print_end TIMESTAMPTZ,
  print_status print_job_status,

  -- Customer sign-off
  signoff_status signoff_status DEFAULT 'pending',
  signoff_token TEXT,
  signoff_sent_at TIMESTAMPTZ,
  signoff_completed_at TIMESTAMPTZ,
  signoff_signature_url TEXT,

  -- Brand materials (from customer intake)
  brand_files JSONB DEFAULT '[]'::jsonb,
  ai_recommendations JSONB,
  design_complexity_score INTEGER,

  -- Job type metadata
  job_type TEXT DEFAULT 'Commercial',
  job_subtype TEXT DEFAULT 'Vehicle',

  xp_awarded_stages JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5F. DESIGNS (linked bidirectionally to jobs)
-- ============================================================
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  status design_status NOT NULL DEFAULT 'brief',

  -- Canvas data
  canvas_data JSONB,
  thumbnail_url TEXT,

  -- Brief (COPIED from job when design is created, then independently editable)
  brief_vehicle_type TEXT,
  brief_wrap_type TEXT,
  brief_coverage INTEGER,
  brief_material TEXT,
  brief_lamination TEXT,
  brief_total_sqft DECIMAL(10,2),
  brief_panels JSONB DEFAULT '[]'::jsonb,
  brief_notes TEXT,
  brief_brand_files JSONB DEFAULT '[]'::jsonb,
  brief_ai_recommendations JSONB,
  brief_wrap_areas TEXT,
  brief_exclusion_areas TEXT,

  -- Revision tracking
  revision_number INTEGER DEFAULT 1,
  max_revisions INTEGER DEFAULT 2,
  revision_notes TEXT,
  parent_design_id UUID REFERENCES designs(id),

  -- AI feedback
  ai_feedback JSONB,
  ai_production_ready BOOLEAN,

  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from jobs to designs (bidirectional link)
ALTER TABLE jobs ADD CONSTRAINT fk_active_design
  FOREIGN KEY (active_design_id) REFERENCES designs(id) ON DELETE SET NULL;

-- ============================================================
-- 5G. MOCKUPS
-- ============================================================
CREATE TABLE mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID REFERENCES designs(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  ai_prompt TEXT,
  notes TEXT,
  is_internal BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5H. JOB EXPENSES (customer-facing + internal)
-- ============================================================
CREATE TABLE job_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_customer_facing BOOLEAN DEFAULT false,
  is_billable BOOLEAN DEFAULT true,
  added_by UUID REFERENCES profiles(id),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5I. MEDIA LIBRARY (photos, tags, AI search)
-- ============================================================
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,

  -- Associations (a file can belong to multiple entities)
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
  onboarding_link_id UUID REFERENCES onboarding_links(id) ON DELETE SET NULL,

  -- Tagging & search
  tags JSONB DEFAULT '[]'::jsonb,
  ai_description TEXT,
  ai_tags JSONB DEFAULT '[]'::jsonb,
  vehicle_type_tag TEXT,
  wrap_type_tag TEXT,
  color_tags JSONB DEFAULT '[]'::jsonb,

  -- Source tracking
  source TEXT DEFAULT 'internal',
  uploaded_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast tag-based searches
CREATE INDEX idx_media_tags ON media_files USING gin(tags);
CREATE INDEX idx_media_ai_tags ON media_files USING gin(ai_tags);
CREATE INDEX idx_media_job ON media_files(job_id);
CREATE INDEX idx_media_customer ON media_files(customer_id);

-- ============================================================
-- 5J. INSTALLER BIDS
-- ============================================================
CREATE TABLE installer_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  installer_id UUID REFERENCES profiles(id),
  status bid_status NOT NULL DEFAULT 'submitted',
  bid_amount DECIMAL(10,2) NOT NULL,
  estimated_hours DECIMAL(6,2),
  notes TEXT,
  available_dates JSONB DEFAULT '[]'::jsonb,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5K. INSTALLER TIME LOG
-- ============================================================
CREATE TABLE installer_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  installer_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  task_phase TEXT,
  start_time TIME,
  end_time TIME,
  hours DECIMAL(6,2) NOT NULL,
  notes TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5L. INSTALLER LIABILITY SIGN-OFF
-- ============================================================
CREATE TABLE installer_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  installer_id UUID REFERENCES profiles(id),

  -- Checklist items (all must be true)
  material_received_correct BOOLEAN DEFAULT false,
  material_inspected_no_defects BOOLEAN DEFAULT false,
  material_matches_specs BOOLEAN DEFAULT false,
  surface_clean_dry BOOLEAN DEFAULT false,
  vehicle_condition_noted BOOLEAN DEFAULT false,
  accepts_material_responsibility BOOLEAN DEFAULT false,
  accepts_vehicle_responsibility BOOLEAN DEFAULT false,

  pre_existing_damage_notes TEXT,
  installer_name_printed TEXT,
  signature_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5M. MATERIAL INVENTORY
-- ============================================================
CREATE TABLE material_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name TEXT NOT NULL,
  material_brand TEXT,
  material_sku TEXT,
  material_type TEXT NOT NULL,          -- 'vinyl', 'lamination', 'transfer_tape', etc.
  color TEXT,
  finish TEXT,                          -- 'gloss', 'matte', 'satin', etc.
  status roll_status NOT NULL DEFAULT 'in_stock',

  -- Dimensions
  roll_width_inches DECIMAL(6,2),
  roll_length_feet DECIMAL(8,2),        -- original length
  remaining_length_feet DECIMAL(8,2),   -- manually updated as material is used
  total_sqft DECIMAL(10,2),
  remaining_sqft DECIMAL(10,2),

  -- Cost
  cost_per_roll DECIMAL(10,2),
  cost_per_sqft DECIMAL(8,4),

  -- Usage tracking
  jobs_used_on JSONB DEFAULT '[]'::jsonb,
  consumed_at TIMESTAMPTZ,
  consumed_by UUID REFERENCES profiles(id),

  -- Waste tracking
  waste_sqft DECIMAL(10,2) DEFAULT 0,
  waste_notes TEXT,

  location TEXT DEFAULT 'Main rack',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5N. MATERIAL REMNANTS (usable leftover pieces)
-- ============================================================
CREATE TABLE material_remnants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_roll_id UUID REFERENCES material_rolls(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  material_type TEXT NOT NULL,
  color TEXT,
  finish TEXT,
  status remnant_status NOT NULL DEFAULT 'available',

  -- Piece dimensions
  width_inches DECIMAL(6,2) NOT NULL,
  length_inches DECIMAL(8,2) NOT NULL,
  sqft DECIMAL(10,2),

  -- Reservation
  reserved_for_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  reserved_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,

  location TEXT DEFAULT 'Remnant bin',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for matching remnants to jobs
CREATE INDEX idx_remnants_available ON material_remnants(status, material_type, color)
  WHERE status = 'available';

-- ============================================================
-- 5O. PRINT JOBS (scheduling & tracking)
-- ============================================================
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  design_id UUID REFERENCES designs(id),
  printer_id UUID REFERENCES printers(id),
  status print_job_status NOT NULL DEFAULT 'queued',

  -- Scheduling
  scheduled_date DATE,
  scheduled_start_time TIME,
  estimated_print_minutes INTEGER,
  estimated_dry_minutes INTEGER DEFAULT 30,
  estimated_laminate_minutes INTEGER,

  -- Actual times
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  actual_print_minutes INTEGER,
  actual_dry_minutes INTEGER,
  actual_laminate_minutes INTEGER,

  -- Material used
  material_roll_id UUID REFERENCES material_rolls(id),
  lamination_roll_id UUID REFERENCES material_rolls(id),
  sqft_printed DECIMAL(10,2),
  waste_sqft DECIMAL(10,2) DEFAULT 0,

  -- Quality
  quality_notes TEXT,
  needs_reprint BOOLEAN DEFAULT false,
  reprint_reason TEXT,

  printed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5P. PRINTERS
-- ============================================================
CREATE TABLE printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  max_width_inches DECIMAL(6,2),
  print_speed_sqft_per_hour DECIMAL(8,2),
  status TEXT DEFAULT 'operational',
  total_sqft_printed DECIMAL(12,2) DEFAULT 0,
  total_print_hours DECIMAL(10,2) DEFAULT 0,

  -- Maintenance tracking
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_hours DECIMAL(8,2) DEFAULT 100,
  head_strike_count INTEGER DEFAULT 0,
  nozzle_check_last DATE,

  -- Ink levels (percentage remaining, manually updated)
  ink_levels JSONB DEFAULT '{
    "cyan": 100, "magenta": 100, "yellow": 100, "black": 100,
    "light_cyan": 100, "light_magenta": 100, "white": 100
  }'::jsonb,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix circular reference: print_jobs references printers
-- (printers table must exist first — if running in order, this is fine.
-- If not, create printers first, then print_jobs.)

-- ============================================================
-- 5Q. PRINTER MAINTENANCE LOG
-- ============================================================
CREATE TABLE printer_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id UUID REFERENCES printers(id) ON DELETE CASCADE,
  maintenance_type maintenance_type NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  cost DECIMAL(10,2) DEFAULT 0,

  -- What was done
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  ink_replaced JSONB DEFAULT '[]'::jsonb,
  before_notes TEXT,
  after_notes TEXT,
  resolution TEXT,

  -- Printer state at time of maintenance
  total_sqft_at_time DECIMAL(12,2),
  total_hours_at_time DECIMAL(10,2),

  performed_at TIMESTAMPTZ DEFAULT now(),
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5R. SHOP EXPENSES (overhead — PIN-locked in settings)
-- ============================================================
CREATE TABLE shop_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category shop_expense_category NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT,
  due_date DATE,
  paid_date DATE,
  paid BOOLEAN DEFAULT false,
  vendor TEXT,
  receipt_url TEXT,
  notes TEXT,
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5S. SETTINGS (key-value store for app defaults)
-- ============================================================
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_locked BOOLEAN DEFAULT false,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default settings
INSERT INTO app_settings (key, value, category, is_locked, description) VALUES
  ('commission_inbound_rate', '0.045', 'commissions', true, 'Inbound lead agent commission rate on gross profit'),
  ('commission_outbound_rate', '0.06', 'commissions', true, 'Outbound lead agent commission rate on gross profit'),
  ('commission_referral_rate', '0.05', 'commissions', true, 'Referral lead agent commission rate on gross profit'),
  ('cross_referral_rate', '0.025', 'commissions', true, 'Cross-division referral commission rate (wraps↔decking)'),
  ('production_bonus_rate', '0.05', 'commissions', true, 'Production manager bonus rate on profit minus design fee'),
  ('design_fee_default', '150', 'pricing', true, 'Default design fee'),
  ('installer_billing_rate', '35', 'pricing', true, 'Internal billing rate for installer hour budgets'),
  ('material_rate_default', '2.10', 'pricing', true, 'Default material rate per sqft'),
  ('tax_rate', '0.10', 'pricing', true, 'Tax rate applied to subtotals'),
  ('design_canvas_payment', '25000', 'pricing', true, 'Payment amount in cents for customer design canvas access'),
  ('max_design_revisions', '2', 'design', false, 'Default max revisions per design'),
  ('onboarding_link_expiry_days', '30', 'sales', false, 'Days until onboarding link expires'),
  ('printer_maintenance_interval_hours', '100', 'production', false, 'Hours between scheduled printer maintenance'),
  ('xp_lead_created', '10', 'gamification', false, 'XP for creating a new lead'),
  ('xp_deal_closed', '100', 'gamification', false, 'XP for winning a deal'),
  ('xp_job_completed', '75', 'gamification', false, 'XP for completing a job'),
  ('xp_design_approved', '30', 'gamification', false, 'XP for design approval'),
  ('xp_daily_login', '5', 'gamification', false, 'XP for daily login streak'),
  ('xp_expense_logged', '3', 'gamification', false, 'XP for logging an expense'),
  ('xp_photo_uploaded', '5', 'gamification', false, 'XP for uploading to media library'),
  ('monthly_sales_target', '50000', 'targets', false, 'Monthly sales target in dollars'),
  ('weekly_leads_target', '15', 'targets', false, 'Weekly new leads target');

-- ============================================================
-- 5T. GAMIFICATION — XP LEDGER
-- ============================================================
CREATE TABLE xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_ledger_user ON xp_ledger(user_id, created_at DESC);

-- ============================================================
-- 5U. GENIE — AI ASSISTANT CONVERSATION LOG
-- ============================================================
CREATE TABLE genie_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  context_type TEXT,
  context_id UUID,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5V. GENIE — PROACTIVE SUGGESTIONS
-- ============================================================
CREATE TABLE genie_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_type TEXT,
  action_data JSONB,
  context_type TEXT,
  context_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_acted_on BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5W. ACTIVITY LOG (for dashboard feed + Genie context)
-- ============================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_recent ON activity_log(created_at DESC);
CREATE INDEX idx_activity_user ON activity_log(user_id, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mockups ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_remnants ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE genie_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE genie_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has a given role or higher
CREATE OR REPLACE FUNCTION auth_has_role(allowed_roles user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = ANY(allowed_roles)
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users see their own; owner/admin see all
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid() OR auth_has_role(ARRAY['owner','admin']::user_role[])
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE USING (
  auth_has_role(ARRAY['owner','admin']::user_role[])
);

-- General read policy for most tables: any authenticated team member
CREATE POLICY "team_read_customers" ON customers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_leads" ON leads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_jobs" ON jobs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_designs" ON designs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_mockups" ON mockups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_media" ON media_files FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_expenses" ON job_expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_read_activity" ON activity_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write policies: role-based
CREATE POLICY "sales_write_leads" ON leads FOR INSERT WITH CHECK (
  auth_has_role(ARRAY['owner','admin','sales_agent']::user_role[])
);
CREATE POLICY "sales_update_leads" ON leads FOR UPDATE USING (
  auth_has_role(ARRAY['owner','admin','sales_agent']::user_role[])
);
CREATE POLICY "team_write_jobs" ON jobs FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','sales_agent','production']::user_role[])
);
CREATE POLICY "designers_write_designs" ON designs FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','designer','production']::user_role[])
);
CREATE POLICY "team_write_expenses" ON job_expenses FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Installer-specific
CREATE POLICY "installers_read_bids" ON installer_bids FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "installers_write_own_bids" ON installer_bids FOR INSERT WITH CHECK (
  installer_id = auth.uid()
);
CREATE POLICY "installers_own_timelogs" ON installer_time_logs FOR ALL USING (
  installer_id = auth.uid() OR auth_has_role(ARRAY['owner','admin','production']::user_role[])
);
CREATE POLICY "installers_own_signoffs" ON installer_signoffs FOR ALL USING (
  installer_id = auth.uid() OR auth_has_role(ARRAY['owner','admin','production']::user_role[])
);

-- Inventory: production + owner/admin
CREATE POLICY "inventory_read" ON material_rolls FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "inventory_write" ON material_rolls FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','production']::user_role[])
);
CREATE POLICY "remnants_read" ON material_remnants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "remnants_write" ON material_remnants FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','production']::user_role[])
);

-- Print & Printer: production + owner/admin
CREATE POLICY "print_jobs_access" ON print_jobs FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','production']::user_role[])
);
CREATE POLICY "printers_read" ON printers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "printers_write" ON printers FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','production']::user_role[])
);
CREATE POLICY "maintenance_access" ON printer_maintenance_logs FOR ALL USING (
  auth_has_role(ARRAY['owner','admin','production']::user_role[])
);

-- Shop expenses & settings: owner/admin only
CREATE POLICY "shop_expenses_access" ON shop_expenses FOR ALL USING (
  auth_has_role(ARRAY['owner','admin']::user_role[])
);
CREATE POLICY "settings_read" ON app_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_write" ON app_settings FOR UPDATE USING (
  auth_has_role(ARRAY['owner','admin']::user_role[])
);

-- XP & Genie: users see own
CREATE POLICY "xp_own" ON xp_ledger FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "genie_own_convos" ON genie_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "genie_own_suggestions" ON genie_suggestions FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================================
-- Create these buckets in Supabase Storage:
-- 1. "brand-materials"   — customer uploads from onboarding
-- 2. "designs"           — design studio exports & thumbnails
-- 3. "mockups"           — AI-generated and manual mockups
-- 4. "media"             — general media library photos
-- 5. "signatures"        — installer & customer signature images
-- 6. "reports"           — generated PDF reports
-- 7. "receipts"          — expense receipt uploads
```

---

## 6. AUTHENTICATION & AUTO-ACCOUNT CREATION

### The Bug (Previous Build)

When a new user signed in via Google OAuth, Supabase Auth created the `auth.users` row but no matching `profiles` row existed. The app checked `profiles` and returned "No account available."

### The Fix

The `handle_new_user()` trigger in Section 5 fires `AFTER INSERT ON auth.users` and automatically creates a `profiles` row with:
- `full_name` from Google metadata (`full_name` or `name`)
- `avatar_url` from Google metadata (`avatar_url` or `picture`)
- `role` = `'viewer'` (default — owner upgrades them in Settings → Team)
- `ON CONFLICT` clause so it never crashes on duplicate

### Auth Implementation

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/service.ts — API routes ONLY
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Google OAuth Setup

In Supabase Dashboard → Authentication → Providers → Google:
- Enable Google provider
- Add Google Client ID and Secret
- Set redirect URL to `https://your-app.vercel.app/auth/callback`

Login page calls:
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/auth/callback` }
})
```

Auth callback route (`app/auth/callback/route.ts`):
```typescript
import { createServerSupabase } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createServerSupabase()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

### Middleware (Route Protection)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Portal routes are public
  if (path.startsWith('/portal/')) return response

  // Auth routes: redirect to dashboard if logged in
  if (path.startsWith('/login') || path.startsWith('/signup')) {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  // App routes: require auth
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

---

## 7. PROFILES, ROLES & PERMISSIONS

### Role Definitions

| Role | See Dashboard | Sales | Jobs | Design Studio | Production | Inventory | Printer | Installer Bids | Settings (Locked) | Team Mgmt |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **owner** | ✅ All stats + financials | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Manage | ✅ Full | ✅ Full |
| **admin** | ✅ All stats + financials | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Manage | ✅ Most | ✅ Full |
| **sales_agent** | ✅ Own stats + commission | ✅ Own leads | ✅ Read own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **designer** | ✅ Own stats + designs | ❌ | ✅ Read assigned | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **production** | ✅ Production stats | ❌ | ✅ Full | ✅ Read | ✅ Full | ✅ Full | ✅ Full | ✅ Manage | ❌ | ❌ |
| **installer** | ✅ Own stats + pay | ❌ | ✅ Assigned only | ❌ | ❌ | ✅ Read | ❌ | ✅ Own bids | ❌ | ❌ |
| **viewer** | ✅ Read-only overview | ❌ | ✅ Read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Client-Side Permission Helper

```typescript
// lib/permissions.ts
type Permission = 'sales.read' | 'sales.write' | 'jobs.read' | 'jobs.write' |
  'design.read' | 'design.write' | 'production.read' | 'production.write' |
  'inventory.read' | 'inventory.write' | 'printer.read' | 'printer.write' |
  'bids.read' | 'bids.manage' | 'settings.locked' | 'team.manage' |
  'finances.view' | 'expenses.write'

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ['sales.read','sales.write','jobs.read','jobs.write','design.read','design.write',
    'production.read','production.write','inventory.read','inventory.write','printer.read',
    'printer.write','bids.read','bids.manage','settings.locked','team.manage','finances.view',
    'expenses.write'],
  admin: ['sales.read','sales.write','jobs.read','jobs.write','design.read','design.write',
    'production.read','production.write','inventory.read','inventory.write','printer.read',
    'printer.write','bids.read','bids.manage','settings.locked','team.manage','finances.view',
    'expenses.write'],
  sales_agent: ['sales.read','sales.write','jobs.read','expenses.write'],
  designer: ['design.read','design.write','jobs.read'],
  production: ['jobs.read','jobs.write','design.read','production.read','production.write',
    'inventory.read','inventory.write','printer.read','printer.write','bids.read','bids.manage',
    'expenses.write'],
  installer: ['jobs.read','bids.read','inventory.read','expenses.write'],
  viewer: ['jobs.read'],
}

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
```

---

## 8. APP SHELL & NAVIGATION — CRITICAL UX RULES

### THE #1 RULE: Sidebar Never Disappears

The previous build had a bug where clicking into detail pages (tasks, jobs, designs) navigated away from the app shell, causing the sidebar to disappear. This MUST NOT happen.

**How to fix it:** ALL internal pages must be inside the `(app)` route group. The `(app)/layout.tsx` renders the shell. Next.js App Router preserves the layout for all children.

```typescript
// app/(app)/layout.tsx — THE PERSISTENT APP SHELL
'use client'
import { Sidebar } from '@/components/app-shell/Sidebar'
import { Topbar } from '@/components/app-shell/Topbar'
import { GenieFAB } from '@/components/genie/GenieFAB'
import { GenieProvider } from '@/components/genie/GenieProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <GenieProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        {/* Sidebar — ALWAYS rendered, NEVER unmounts */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>

        {/* Genie floating button — ALWAYS visible */}
        <GenieFAB />
      </div>
    </GenieProvider>
  )
}
```

**Rules for every internal page:**
- Located under `app/(app)/...` — NEVER outside this group
- No page should use its own full-page layout or remove the shell
- Detail pages like `[jobId]/page.tsx` or `[designId]/page.tsx` render INSIDE the shell
- Use breadcrumbs for navigation context, not new layouts

### Sidebar Navigation

```
📊 Dashboard
💰 Sales Pipeline
📋 Jobs
🎨 Design Studio
🖼️ Mockup Tool
📸 Media Library
🏭 Production
   ├── Print Schedule
   └── Printer Maintenance
📦 Inventory
   └── Remnants
🔨 Installer Bids
👥 Customers
📊 Reports
🏆 Leaderboard
⚙️ Settings
```

Sidebar items are filtered by the user's role using `hasPermission()`. Installers only see Dashboard, Installer Bids, and their assigned Jobs.

---

## 9. DASHBOARD — COMMAND CENTER

The dashboard is a gamified HUD. It's the first thing everyone sees. It adapts based on role.

### Universal Elements (All Roles)

1. **Welcome Banner** — "Good morning, {name}! 🔥 Day {streak} streak" with XP bar showing progress to next level
2. **Quick Actions Row** — Big, obvious buttons for the most common actions for this role
3. **Activity Feed** — Recent system activity in a scrollable feed

### Owner/Admin Dashboard

- **Revenue This Month** — Big number + Recharts sparkline + % to monthly target
- **Sales Velocity Gauge** — Circular gauge showing current pace vs. target (see Section 28)
- **Profit & Loss Summary** — Revenue, costs, expenses, net profit
- **Pipeline Value** — Total estimated value in each stage
- **Active Jobs Grid** — Cards showing all active jobs with status
- **Team Leaderboard** — Top 5 by XP this month
- **Shop Expenses Summary** — Monthly overhead total
- **AI Genie Insights** — Proactive suggestions (overdue follow-ups, at-risk deals, schedule conflicts)

### Job Status Cards — INLINE ACTIONS (Bug Fix)

The previous build had a "three-dot menu" that opened a dropdown below the card, pushing content down. This was confusing.

**The Fix:** When you click the action button on a job card, it expands **inline on the same row** to reveal:
1. A **status selector** (dropdown or segmented control showing the next logical statuses)
2. Quick action buttons (View, Edit, Assign)

The expansion should be a smooth horizontal slide animation. No content pushing. No hidden dropdowns.

```
┌──────────────────────────────────────────────────────────────┐
│ 🚐 ABC Plumbing Fleet Wrap    ⚡ In Progress    [• • •]    │
│ Due: Mar 15  |  Josh  |  $2,400                              │
│──────────────────────────────────────────────────────────────│
│ CLICKED → expands to:                                        │
│ Status: [In Progress ▼]  →  Quality Check  →  Completed     │
│ [View] [Assign] [Add Expense]                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. ROLE-BASED EMPLOYEE DASHBOARDS

Every role sees a customized dashboard. The MOST IMPORTANT thing for each role is their MONEY FLOW — what they've earned, what's pending, what's projected.

### Sales Agent Dashboard

```
┌─────────────────────────────────────────┐
│ 💰 YOUR EARNINGS                        │
│ This Month: $1,234    YTD: $8,750      │
│ Pending Commission: $456               │
│ Cross-Referral Bonus: $125             │
├─────────────────────────────────────────┤
│ 📈 VELOCITY                            │
│ [Gauge: 78% of monthly target]         │
│ 12 leads this week (target: 15)        │
│ Win rate: 34% (30-day avg)             │
├─────────────────────────────────────────┤
│ 🎯 YOUR PIPELINE                       │
│ Active leads by stage + est. value     │
├─────────────────────────────────────────┤
│ 📋 FOLLOW-UPS DUE TODAY               │
│ List of leads needing attention        │
├─────────────────────────────────────────┤
│ 🏆 RANK: #2 of 5 agents this month    │
└─────────────────────────────────────────┘
```

### Production Manager (Josh) Dashboard

```
┌─────────────────────────────────────────┐
│ 💰 YOUR PRODUCTION BONUS               │
│ This Month: $890    YTD: $5,200        │
│ Formula: 5% × (profit − design fee)    │
├─────────────────────────────────────────┤
│ 🖨️ PRINT QUEUE                        │
│ Today: 3 jobs | Tomorrow: 2 jobs       │
│ [Gantt-style schedule bar]             │
├─────────────────────────────────────────┤
│ 🔧 PRINTER STATUS                      │
│ HP Latex 570: Operational              │
│ Next Maintenance: 23 print-hours       │
│ Ink: C:85% M:72% Y:90% K:45%          │
├─────────────────────────────────────────┤
│ 📦 MATERIAL ALERTS                     │
│ Avery MPI 1105 White: 2 rolls left     │
│ Remnant match available for Job #WQ-xxx│
├─────────────────────────────────────────┤
│ 📋 JOBS NEEDING PRODUCTION BRIEF       │
│ List of approved jobs without briefs   │
└─────────────────────────────────────────┘
```

### Designer Dashboard

```
┌─────────────────────────────────────────┐
│ 🎨 YOUR DESIGNS                        │
│ Active: 4  |  In Review: 2  |  Done: 12│
│ Avg. revision count: 1.3               │
├─────────────────────────────────────────┤
│ 📋 ASSIGNED TO YOU                     │
│ Cards for each design with status      │
├─────────────────────────────────────────┤
│ 🏆 XP: 1,450  |  Level 8              │
│ Badges: [Speed Demon] [Zero Revisions] │
└─────────────────────────────────────────┘
```

### Installer Dashboard

```
┌─────────────────────────────────────────┐
│ 💰 YOUR PAY                            │
│ This Month: $2,100    YTD: $12,400     │
│ Hours Logged: 62h  |  Avg: $33.87/hr   │
├─────────────────────────────────────────┤
│ 🔨 OPEN BIDS                           │
│ 3 jobs available for bidding           │
│ [View & Bid buttons]                   │
├─────────────────────────────────────────┤
│ 📋 YOUR SCHEDULED INSTALLS             │
│ Calendar view of upcoming jobs         │
├─────────────────────────────────────────┤
│ ⏱️ ACTIVE TIME LOG                     │
│ Current job timer + log button         │
└─────────────────────────────────────────┘
```

---

## 11. SALES PIPELINE

### Layout — Onboarding Link Generator at TOP

**Bug Fix:** The onboarding link generator was buried in the previous build. It must be the FIRST element on the sales page.

```
┌──────────────────────────────────────────────────────────────┐
│ 🔗 GENERATE ONBOARDING LINK                                 │
│ [Select Lead ▼] or [Create New Lead]  [Generate Link ▶]     │
│ Last generated: https://app.usawrap.co/portal/abc123...      │
│ [Copy Link] [Send via Email] [Send via SMS]                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Pipeline Board (Kanban)                                      │
│ New → Contacted → Qualified → Proposal → Negotiating → Won  │
│ [Cards draggable between columns]                            │
└──────────────────────────────────────────────────────────────┘
```

### Lead Detail Page (`/sales/[leadId]`)

- Renders INSIDE the app shell (sidebar stays visible)
- Shows: customer info, lead status, estimated value, assigned agent, follow-up date
- Financial preview: estimated commission, cross-referral if applicable
- Activity timeline
- Linked onboarding link with status (sent, opened, submitted, paid)
- Genie suggestion area: "This lead has been in 'contacted' for 5 days. Draft a follow-up?"

---

## 12. ONBOARDING LINKS (Customer Intake)

When a sales agent generates an onboarding link, a row is created in `onboarding_links` with a unique token. The customer visits `/portal/{token}` and sees:

1. **Welcome screen** with custom message
2. **Multi-step form:**
   - Company info, contact name, phone, email
   - Vehicle details (type, year, make, model, color, VIN)
   - Wrap type selection (full, partial, specific panels)
   - Upload brand materials (logo, colors, guidelines, reference photos)
   - Design notes / special instructions
3. **Payment step** (if required): Stripe Checkout for $250 → unlocks design canvas
4. **Design canvas** (if included): Fabric.js canvas where they can pre-design
5. **Confirmation** with tracking link

### Customer Uploads → System Integration

**Critical:** All files the customer uploads via the intake form MUST:
1. Be stored in Supabase Storage (`brand-materials` bucket)
2. Create entries in the `media_files` table with `source = 'customer_intake'`
3. Link to the customer, lead, and eventually the job
4. Be viewable from the customer detail page, job detail page, and media library
5. Have AI tags generated automatically (see Section 17)

---

## 13. JOB PROJECTS — FULL LIFECYCLE

A job is created when a lead is marked "won." It inherits data from the lead and customer.

### Job Status Flow

```
intake → design → revision → pending_signoff → approved →
print_queue → printing → printed → bid_open → scheduled →
in_progress → quality_check → completed → invoiced → paid
```

Each transition can be done from:
- The job detail page
- The dashboard inline action row (see Section 9)
- The Genie (proactive suggestion to advance status)

### Job Detail Page — Tabs

The job detail page (`/jobs/[jobId]`) has tabbed navigation:

| Tab | Content |
|-----|---------|
| **Overview** | All job info, financial summary, status timeline |
| **Design** | Linked design(s), can assign/unassign, preview canvas |
| **Production** | Production brief, measurements, panel breakdown |
| **Expenses** | Customer expenses quick-add (see Section 14) |
| **Installer** | Work order, assigned installer, time logs, sign-off |
| **Timeline** | Gantt-style timeline including print scheduling |
| **Materials** | Material pull sheet, roll assignments, remnant matches |
| **Files** | All media files for this job (customer uploads, photos, mockups) |

### Financial Calculations (matches PDF format)

The job financial section mirrors the Sales Order PDF (page 1):

```
FINANCIAL BREAKDOWN
───────────────────────────────────────────
Category          Amount       Notes
Material          $420.00      31%
Install Labor     $245.00      18% · 7h budgeted
Design & Fees     $150.00      11%
───────────────────────────────────────────
NET PROFIT        $535.00      40% GPM
TOTAL SALE:       $1,350.00
Profit: $535.00   GPM: 40%

AGENT COMMISSION: $24.08 (Inbound 4.5% GP)
PRODUCTION BONUS — JOSH: $19.25
  5% of profit ($26.75) − $150 design fee = $19.25
```

Formulas:
```
material_cost = total_sqft × material_rate
install_labor_cost = installer_pay  (from accepted bid or manual entry)
install_hours_budgeted = install_labor_cost ÷ installer_billing_rate
net_profit = total_sale − material_cost − install_labor_cost − design_fee − additional_fees − customer_expenses
gross_profit_margin = net_profit ÷ total_sale × 100
agent_commission = net_profit × source_commission_rate
production_bonus = MAX(0, (net_profit × production_bonus_rate) − design_fee)
```

---

## 14. CUSTOMER EXPENSES (Quick-Add in Jobs)

A dedicated "Expenses" tab on each job for quickly adding unexpected costs.

### UI

```
┌──────────────────────────────────────────────────────────────┐
│ CUSTOMER EXPENSES FOR JOB #WQ-1771571753                     │
│                                                              │
│ [+ Add Expense]                                              │
│                                                              │
│ Date       Category      Description          Amount  Billable│
│ 2/15/26    material      Extra chrome vinyl    $85.00   ✅   │
│ 2/16/26    misc          Parking for install   $25.00   ✅   │
│ 2/17/26    subcontractor Tint removal          $120.00  ✅   │
│                                                              │
│ TOTAL CUSTOMER EXPENSES: $230.00                             │
│ (Automatically included in job cost calculations)            │
└──────────────────────────────────────────────────────────────┘
```

The "Add Expense" button opens a quick modal:
- Category dropdown (material, labor, subcontractor, equipment, travel, misc)
- Description (text)
- Amount (number)
- Billable? (toggle — if billable, added to total sale)
- Receipt upload (optional)

Expenses are stored in `job_expenses` and automatically factored into the job's financial calculations.

---

## 15. DESIGN STUDIO — BIDIRECTIONAL WITH JOBS

### The Bidirectional Link Problem (Bug Fix)

Previous build: clicking "Add Design" in Design Studio created a design but didn't link it to any job, and the design brief was empty.

**The Fix:** Designs and Jobs are linked bidirectionally:

1. **From a Job → Create Design:** Copies the job's brief data (vehicle type, wrap type, coverage, material, panels, sqft, brand files, AI recommendations, scope of work) into the design's `brief_*` fields. Sets `design.job_id = job.id` and `job.active_design_id = design.id`.

2. **From Design Studio → Create Design:** Must select a job to link to (or create an unlinked design). If linked, copies brief from job.

3. **From Job → Assign Existing Design:** Pick from existing unlinked designs. Links them.

4. **From Design → Assign to Job:** Pick a job. Links them.

### Design Studio Page

Grid of all designs with filters (by status, by job, by designer). Each card shows thumbnail, title, status badge, linked job ref.

### Design Canvas Page (`/design-studio/[designId]`)

**Renders INSIDE the app shell** (sidebar stays visible).

Split layout:
- **Left 70%:** Fabric.js canvas with vehicle template background
- **Right 30%:** Panel with tabs:
  - **Brief** — All brief data copied from job (read-only reference)
  - **AI Feedback** — Real-time design feedback from Claude (see Section 19)
  - **Tools** — Canvas tools (add text, upload image, shapes, colors)
  - **History** — Revision history

### Internal AI Feedback on Design

When the designer modifies the canvas (debounced 3 seconds), the canvas data is sent to `/api/ai/design-feedback` which returns issues (readability, contrast, legal, sizing). These show in the AI Feedback panel.

---

## 16. INTERNAL AI MOCKUP TOOL

**New Feature:** The AI mockup generation (previously only for customer portal) is also available as an internal tool for the team.

### Mockup Tool Page (`/mockup-tool`)

```
┌──────────────────────────────────────────────────────────────┐
│ 🎨 AI MOCKUP GENERATOR                                      │
│                                                              │
│ [Select Job ▼] or [Freestyle]                                │
│                                                              │
│ Vehicle: [Van ▼]  Color: [White ▼]  Angle: [3/4 Front ▼]    │
│ Environment: [Street ▼]  Time: [Day ▼]                      │
│                                                              │
│ Design Source: [Upload Image] or [Select from Design Studio] │
│                                                              │
│ Additional notes: [________________________]                 │
│                                                              │
│ [Generate Mockup ▶]                                          │
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ Mockup 1│ │ Mockup 2│ │ Mockup 3│   History                │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                              │
│ [Save to Job] [Save to Media Library] [Send to Customer]     │
└──────────────────────────────────────────────────────────────┘
```

Uses the same Claude prompt → Replicate image gen pipeline as the customer-facing mockup (see Section 31 API Routes), but with more control over parameters.

---

## 17. MEDIA LIBRARY

### Purpose

Central storage for ALL photos in the system — customer uploads, job site photos, completed wrap photos, design exports, mockups. Tagged and searchable. AI recommends similar photos when quoting similar jobs.

### Media Library Page (`/media`)

```
┌──────────────────────────────────────────────────────────────┐
│ 📸 MEDIA LIBRARY                         [+ Upload] [🔍]    │
│                                                              │
│ Filters: [All ▼] [Vehicle Type ▼] [Wrap Type ▼] [Color ▼]  │
│          [Tags ▼] [Customer ▼] [Job ▼] [Date Range]         │
│                                                              │
│ Search: [___________________________] (searches tags + AI)   │
│                                                              │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │    │ │    │ │    │ │    │ │    │ │    │ │    │          │
│ │img1│ │img2│ │img3│ │img4│ │img5│ │img6│ │img7│          │
│ │    │ │    │ │    │ │    │ │    │ │    │ │    │          │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
│ ABC      Fleet   Chrome  Box     Van     Car     Deck       │
│ Plumbing wrap    detail  truck   side    hood    stain       │
└──────────────────────────────────────────────────────────────┘
```

### Auto-Tagging on Upload

When a photo is uploaded (via any path — customer intake, job page, direct upload), the API:
1. Stores file in Supabase Storage (`media` bucket)
2. Creates `media_files` row with associations
3. Calls Claude Vision to generate: `ai_description`, `ai_tags`, `vehicle_type_tag`, `wrap_type_tag`, `color_tags`

### AI Similar Photo Recommendations

When creating a quote for a new job, the system calls `/api/ai/similar-photos` which:
1. Takes the new job's vehicle type, wrap type, and description
2. Searches `media_files` by matching tags
3. Uses Claude to rank results by visual similarity to the described job
4. Returns top 5 recommended photos that can be attached to the quote/proposal

This lets you send a customer reference photos of similar completed work.

---

## 18. COMMISSION & CROSS-REFERRAL ENGINE

### Commission Types

1. **Agent Source Commission** — Percentage of gross profit based on lead source:
   - Inbound: 4.5% GP (default from settings)
   - Outbound: 6% GP
   - Referral: 5% GP
   - Walk-in: 4.5% GP
   - Repeat: 4% GP
   - Per-agent override possible via `profiles.commission_rate_override`

2. **Cross-Division Referral** — When a wraps agent refers a customer to decking (or vice versa):
   - Default: 2.5% of gross profit on the referred job
   - Configurable in Settings → Commissions
   - Tracked on the lead: `referred_by`, `referral_from_division`, `cross_referral_rate`
   - Goes BOTH ways: wraps→decking and decking→wraps

3. **Production Bonus** — For production manager:
   - Default: 5% of profit MINUS design fee
   - Formula: `MAX(0, (net_profit × 0.05) − design_fee)`
   - Example from PDF: 5% of profit ($10.36) − $150 design fee = $0.00

### Commission Calculation Engine

```typescript
// lib/commission.ts
interface CommissionResult {
  agentCommission: number
  crossReferralCommission: number
  productionBonus: number
}

export function calculateCommissions(
  netProfit: number,
  sourceRate: number,
  crossReferralRate: number | null,
  productionBonusRate: number,
  designFee: number
): CommissionResult {
  return {
    agentCommission: Math.round(netProfit * sourceRate * 100) / 100,
    crossReferralCommission: crossReferralRate
      ? Math.round(netProfit * crossReferralRate * 100) / 100
      : 0,
    productionBonus: Math.max(0,
      Math.round((netProfit * productionBonusRate - designFee) * 100) / 100
    ),
  }
}
```

---

## 19. INSTALLER BID SYSTEM

When a job reaches `bid_open` status, it appears on the Installer Bid Board.

### Bid Board Page (`/installer-bids`)

**For Production/Admin:** See all open jobs, manage bids, accept/reject.
**For Installers:** See available jobs, submit bids with amount + estimated hours + available dates.

```
┌──────────────────────────────────────────────────────────────┐
│ 🔨 INSTALLER BID BOARD                                      │
│                                                              │
│ OPEN FOR BIDS (3)                                            │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ WQ-1234567890 — ABC Plumbing Van Wrap                  │   │
│ │ Full Wrap | 180 sqft | Avery MPI 1105                  │   │
│ │ [View Production Brief PDF]                            │   │
│ │ Bids: 2 received                                       │   │
│ │ [Submit Bid] (installer view)                          │   │
│ │ [View Bids] [Accept Bid ▼] (admin view)                │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Bid Submission (Installer View)

- Amount ($)
- Estimated hours
- Available dates (multi-select calendar)
- Notes

### Bid Acceptance Flow

1. Production/admin reviews bids
2. Accepts one → `installer_bids.status = 'accepted'`, all others → `'rejected'`
3. Job updated: `installer_id`, `installer_pay`, `install_hours_budgeted`
4. Job status → `'scheduled'`
5. Installer gets notification + the Production Brief and Installer Work Order PDFs are auto-generated and attached to the bid

---

## 20. REPORTS & DOCUMENT GENERATION

All reports are generated as PDFs using `@react-pdf/renderer`, matching the format from the uploaded PDF exactly.

### Report Types

#### 1. SALES ORDER (Page 1 of PDF)

```
USA WRAP CO
SALES ORDER
REF: {ref_number}    DATE: {date}    STATUS: {status}

CLIENT INFORMATION          JOB DETAILS
{customer_name}             Agent: {agent_name}
{customer_company}          Lead: {source} ({commission_rate}%)
{customer_phone}            Installer: {installer_name}
{customer_email}            Job Type: {job_type} · {job_subtype}
{customer_address}          Prod.: {production_manager}
                            Install Date: {install_date}

Vehicle: {year} {make} {model}
Install: {install_date}

FINANCIAL BREAKDOWN
Category          Amount       Notes
Material          ${amount}    {pct}%
Install Labor     ${amount}    {pct}% · {hours}h budgeted
Design & Fees     ${amount}    {pct}%
─────────────────────────────────────────
NET PROFIT        ${amount}    {gpm}% GPM
TOTAL SALE:       ${total}
Profit: ${profit}   GPM: {gpm}%

AGENT COMMISSION: ${amount}
{source} {rate}% GP

PRODUCTION BONUS — {prod_manager}:  ${amount}
{rate}% of profit (${calc}) − ${design_fee} design fee = ${result}

USA WRAP CO — Confidential | REF: {ref} | Generated {datetime} | Page 1 of 4
```

#### 2. PRODUCTION BRIEF (Page 2 of PDF)

```
USA WRAP CO
PRODUCTION BRIEF
REF: {ref} | {customer}
{vehicle}
Installer: {installer}  Prod: {prod_manager}  Install: {date}

MEASUREMENTS & MATERIAL BREAKDOWN

UNIT DIMENSIONS
Vehicle: {vehicle_description}
Wrap Type: {wrap_type}
Total Wrap Sqft: {total_sqft} sqft

MATERIAL
Type: {material_type}
Sqft: {sqft} · Rate: ${rate}/sqft
Est. Cost: ${material_cost}

PANEL / SIDE BREAKDOWN
Panel / Surface          Dimensions       Sq Ft
{panel_name}             {dimensions}     {sqft} sqft
...
TOTAL                                     {total_sqft} sqft

SCOPE OF WORK
WRAP THESE AREAS:           DO NOT WRAP / EXCLUSIONS:
{wrap_areas}                {exclusion_areas}

DESIGN & ARTWORK
Design / Artwork Required: {YES/NO} — {notes}

PRODUCTION BONUS — {name}
${amount} ({rate}% profit: ${calc} − ${design_fee} design fee)
```

#### 3. INSTALLER WORK ORDER (Pages 3–4 of PDF)

```
USA WRAP CO
INSTALLER WORK ORDER
REF: {ref} | {customer}
{vehicle}
Installer: {installer}  Install Date: {date}

YOUR PAY: ${amount}
Budget: {hours}h | Rate: ${rate}/hr | ${billing_rate}/hr billing rate

If job runs over budget hrs, talk to manager.

PAY BREAKDOWN:
Total installer pay: ${pay} | Budget hours: {hours}h | Rate: ${rate}/hr
${billing_rate}/hr is the internal billing rate used to calculate hour budgets.

VEHICLE ACCESS: {access_notes}

PANEL MEASUREMENTS
Panel / Surface          Dimensions       Sq Ft    Notes
{panel_name}             {dimensions}     {sqft}   {notes}
...
TOTAL NET SQ FT                          {total_sqft} sqft

WORK INSTRUCTIONS
WRAP THESE AREAS:           DO NOT WRAP:
{wrap_areas}                {exclusion_areas}

--- PAGE 4: SIGN-OFF ---

TIME LOG — RECORD ACTUAL HOURS
Date | Technician | Task/Phase | Start | Finish | Hours | Sign
(empty rows for manual logging + digital time logger)

Budget: {hours}h total · Pay: ${pay} · Rate: ~${rate}/hr

MATERIAL ACCEPTANCE & LIABILITY AGREEMENT

☐ I have inspected the printed material and confirm it is FREE OF VISIBLE DEFECTS
☐ I confirm material dimensions are correct for this job ({sqft} sqft required)
☐ I take RESPONSIBILITY for any damage to the material during installation
☐ Any damage to vehicle paint, substrate, or accessories during install is MY RESPONSIBILITY
  unless documented and reported to shop manager BEFORE starting work
☐ I confirm the vehicle was received in the condition noted below

Installer Signature (REQUIRED): _____________ Date: _____________

Pre-existing vehicle damage / condition notes:
_____________________________________________

MATERIAL INSPECTION & INSTALLER LIABILITY AGREEMENT
☐ Material roll(s) received and counted correctly
☐ Material inspected for defects, bubbles, or print errors — BEFORE cutting
☐ Material color/design matches job specs
☐ Surface is clean, dry, and free of contaminants before application
☐ Vehicle condition noted — any existing damage documented below

PRE-EXISTING DAMAGE / NOTES: ___________________________

AGREEMENT: By signing below, I confirm I have inspected the material and vehicle.
I accept responsibility for any damage to the wrap film or vehicle caused during
installation that was not documented above.

Installer Name (print): _____________ Signature: _____________ Date: _____________
```

#### 4. CUSTOMER REPORT

A clean version for the customer that shows:
- Job overview (vehicle, wrap type, coverage)
- Scope of work (what we will and won't wrap)
- Design preview (thumbnail)
- Material specifications
- Timeline
- Price (total sale only — no internal costs/margins)
- Sign-off section (digital signature via portal)

---

## 21. PRODUCTION BRIEF & CUSTOMER SIGN-OFF WORKFLOW

### The Flow

1. **Lead won → Job created** with all details from intake
2. **Production manager reviews** — fills in exact measurements, panel breakdown, material selection, scope of work
3. **Production brief generated** as PDF
4. **Customer sign-off link sent** — customer views brief in portal, reviews scope, signs digitally
5. **Customer approves** → job status moves to `approved` → design begins
6. **If customer rejects** → notes sent back, production manager revises, re-sends

### Sign-Off Portal Page (`/portal/[token]/signoff`)

Shows the production brief in a clean format (not the full internal PDF — no financials). Customer can:
- Review all specs (vehicle, measurements, panels, scope, material, exclusions)
- Add comments/questions
- Sign with finger/mouse (react-signature-canvas)
- Approve or Request Changes

The signature is stored in Supabase Storage (`signatures` bucket) and the URL saved to `jobs.signoff_signature_url`.

---

## 22. MATERIAL INVENTORY, WASTE & REMNANT TRACKING

### Material Inventory Page (`/inventory`)

```
┌──────────────────────────────────────────────────────────────┐
│ 📦 MATERIAL INVENTORY                   [+ Add Roll]        │
│                                                              │
│ Filters: [All Types ▼] [In Stock ▼] [Brand ▼]               │
│                                                              │
│ VINYL ROLLS                                                  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Avery MPI 1105 — White Gloss                            │ │
│ │ 54" × 150ft (remaining: 87ft) | $2.10/sqft              │ │
│ │ Location: Rack A-3 | Status: In Use                     │ │
│ │ Used on: WQ-123, WQ-456                                 │ │
│ │ [Update Remaining] [Log Waste] [Mark Consumed] [Cut Remnant] │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ LAMINATION ROLLS                                             │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Avery DOL 1460 — Gloss                                  │ │
│ │ 54" × 150ft (remaining: 120ft) | $0.85/sqft             │ │
│ │ [Update Remaining] [Log Waste] [Mark Consumed]           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ USAGE STATS                                                  │
│ Rolls consumed this month: 8                                 │
│ Total waste: 47 sqft (3.2% waste rate)                       │
│ Remnants available: 12 pieces                                │
└──────────────────────────────────────────────────────────────┘
```

### Key Actions

1. **Add Roll** — Enter material name, brand, SKU, type, color, finish, dimensions, cost
2. **Update Remaining** — Manually enter how many feet are left on a roll
3. **Log Waste** — Record waste sqft + reason (trim, mistake, defect)
4. **Mark Consumed** — Roll is empty. Records consumption date, final waste. Status → `consumed`. Updates stats.
5. **Cut Remnant** — When you have a usable leftover piece, record its dimensions. Creates entry in `material_remnants` with `status = 'available'`.

### Remnant Matching

When quoting a job, the system (and Genie) checks `material_remnants` for available pieces that:
- Match the material type and color
- Are large enough for the job (or a panel within the job)

The `/api/ai/material-match` route uses Claude to intelligently match remnants:
```
"You have a 54"×36" piece of Avery MPI 1105 White Gloss.
The job needs 54"×48" for a truck hood panel.
This piece is too small for the hood panel but could cover
a side mirror panel (12"×18"). Recommend using it for: [panel]."
```

---

## 23. PRINT PRODUCTION & SCHEDULING

### Print Schedule Page (`/production/print-schedule`)

Calendar view (day/week) showing print jobs with time blocks:

```
┌──────────────────────────────────────────────────────────────┐
│ 🖨️ PRINT SCHEDULE                      [+ Schedule Print]   │
│                                                              │
│ Today: Feb 20, 2026                                          │
│                                                              │
│ 8am  ████████████ WQ-123 ABC Plumbing (print: 2.5h)        │
│ 10:30 ░░░ drying (30min)                                     │
│ 11am ████ WQ-123 lamination (45min)                          │
│ 12pm — LUNCH —                                               │
│ 1pm  ██████████████████ WQ-456 Fleet #1 (print: 3h)        │
│ 4pm  ░░░ drying (30min)                                      │
│ 4:30 ██████ WQ-456 lamination (1h)                           │
│                                                              │
│ Tomorrow:                                                    │
│ 8am  ████████████████ WQ-456 Fleet #2 (print: 3h)          │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

### Print Job Creation

From a job in `print_queue` status:
1. Select printer
2. Set scheduled date + start time
3. System estimates print time based on sqft + printer speed
4. Add drying time (default 30min, adjustable)
5. Add lamination time if needed
6. Select material roll(s) from inventory
7. Select lamination roll if applicable

### Print Tracking

During printing, production manager updates status:
- `queued` → `prepping` → `printing` → `drying` → `laminating` → `done`
- Can log actual times for each phase
- If failed → `failed` with reason → can create reprint
- Tracks sqft printed and waste from each print job
- Updates material roll `remaining_length_feet` accordingly

---

## 24. PRINTER MAINTENANCE SYSTEM

### Printer Page (`/production/printer`)

```
┌──────────────────────────────────────────────────────────────┐
│ 🔧 PRINTER MANAGEMENT                                       │
│                                                              │
│ HP Latex 570 (SN: ABC123)                                    │
│ Status: ✅ Operational                                       │
│ Max Width: 64"  |  Speed: ~120 sqft/hr                       │
│                                                              │
│ LIFETIME STATS                                               │
│ Total Printed: 12,450 sqft  |  Total Hours: 234h             │
│                                                              │
│ INK LEVELS (manually updated)                                │
│ [C: 85%] [M: 72%] [Y: 90%] [K: 45%] [LC: 88%] [LM: 78%]  │
│ [W: 34%]  ⚠️ White ink low!                                  │
│ [Update Ink Levels]                                          │
│                                                              │
│ MAINTENANCE                                                  │
│ Last: Feb 10, 2026 — Scheduled cleaning                      │
│ Next Due: ~23 print-hours (est. Feb 28)                      │
│ [Log Maintenance] [Schedule Maintenance]                     │
│                                                              │
│ MAINTENANCE HISTORY                                          │
│ Date       Type          Description              Cost       │
│ 2/10/26    Cleaning      Full head clean           $0        │
│ 1/28/26    Calibration   Color calibration         $0        │
│ 1/15/26    Repair        Replace damper unit       $450      │
│ 12/20/25   Head Replace  New print head            $2,800    │
│                                                              │
│ ALERTS                                                       │
│ ⚠️ White ink below 40% — order replacement                   │
│ ⚠️ Nozzle check overdue (last: Feb 5)                        │
│ ⏰ Scheduled maintenance in 23 print-hours                   │
└──────────────────────────────────────────────────────────────┘
```

### Maintenance Log Entry

- Type: scheduled / unscheduled / cleaning / repair / calibration / head_replacement / nozzle_check
- Description of what was done
- Parts replaced (JSON list)
- Ink cartridges replaced (JSON list)
- Cost
- Before/after notes
- Resolution
- Printer state at time (total sqft, total hours)
- Next due date

### Automatic Alerts

The Genie monitors printer state and generates suggestions:
- "Printer has run {hours}h since last maintenance. Schedule a cleaning?"
- "White ink at 34%. Order a replacement cartridge?"
- "Nozzle check hasn't been done in 15 days. Run one before the next print job?"

---

## 25. TIMELINE MANAGER (with Print Times)

Each job has a Timeline tab showing all phases with actual and estimated times:

```
┌──────────────────────────────────────────────────────────────┐
│ TIMELINE — WQ-1771571753                                     │
│                                                              │
│ Phase              Scheduled    Actual      Status            │
│ ─────────────────────────────────────────────────────────────│
│ Design             Feb 21-25    Feb 21-24   ✅ Complete       │
│ Client Review      Feb 25-27    Feb 25-26   ✅ Complete       │
│ Revision           Feb 27-28    —           ⏭️ Skipped       │
│ Customer Sign-Off  Mar 1        Mar 1       ✅ Approved       │
│ Print: Prep        Mar 3        —           ⏳ Upcoming       │
│ Print: Printing    Mar 3 8am    —           ⏳ Upcoming       │
│ Print: Drying      Mar 3 11am   —           ⏳ Upcoming       │
│ Print: Lamination  Mar 3 12pm   —           ⏳ Upcoming       │
│ Installer Bidding  Mar 3-5      —           ⏳ Upcoming       │
│ Installation       Mar 8-9      —           📅 Scheduled      │
│ Quality Check      Mar 9        —           —                 │
│ Invoicing          Mar 10       —           —                 │
└──────────────────────────────────────────────────────────────┘
```

Print times are pulled from the `print_jobs` table and integrated into the timeline. This gives a complete view of the job lifecycle.

---

## 26. AI GENIE ASSISTANT

The Genie is the soul of the app. It lives everywhere.

### Architecture

1. **GenieFAB** — Floating action button (bottom-right corner), always visible inside the app shell. Click to open the chat drawer.

2. **GenieChatDrawer** — Slide-out panel with a chat interface. Conversational AI powered by Claude Sonnet for speed. Maintains context per page (knows which job/lead/design you're looking at).

3. **GenieInlineSuggestion** — Small, contextual cards that appear INSIDE the current page when the Genie has a tip. Think of them as smart sticky notes. They appear near the relevant section.

### How It Works

**Reactive (User Asks):** User types a question in the chat drawer. The Genie answers using the current page context + full system data.

**Proactive (Genie Offers):** Background process checks for conditions and creates `genie_suggestions`:
- "Lead #{name} hasn't been contacted in 5 days. Want me to draft a follow-up email?"
- "Job #WQ-xxx has been in 'design' for 8 days. Nudge the designer?"
- "You have a remnant piece that could save $85 on the quote for Job #WQ-xxx."
- "Your sales velocity is 12% below target. Focus on converting these 3 qualified leads."
- "Printer maintenance due in ~5 print hours."
- "This customer uploaded new brand files. View them?"

### Genie Capabilities

| Capability | Description |
|-----------|-------------|
| **Draft Messages** | "Draft a follow-up email for this lead" → generates email text |
| **Explain Financials** | "Break down the profit on this job" → explains the math |
| **Recommend Actions** | "What should I do next on this lead?" → suggests next step |
| **Schedule Help** | "When can we fit a 3-hour print job this week?" → checks print schedule |
| **Material Match** | "Do we have remnant material for this job?" → checks inventory |
| **Design Feedback** | "Review this design for production issues" → triggers design QA |
| **Generate Mockup** | "Create a mockup of this design on a white van" → triggers mockup gen |
| **Commission Calc** | "What's my commission on this job if I close at $2,400?" → calculates |

### API Route: `/api/ai/genie-chat`

```typescript
// Simplified flow
export async function POST(req: Request) {
  const { message, context, conversationHistory } = await req.json()

  // Build system prompt with current context
  const systemPrompt = `You are the Genie, an AI assistant for USA WRAP CO's shop management system.
  You're helpful, proactive, slightly playful, and always focused on efficiency and profit.
  Current user: ${context.userName} (${context.userRole})
  Current page: ${context.currentPage}
  ${context.entityData ? `Viewing: ${JSON.stringify(context.entityData)}` : ''}
  Today: ${new Date().toLocaleDateString()}
  
  You can help with: drafting messages, explaining financials, recommending next actions,
  checking material inventory, scheduling, and generating reports. Keep responses concise.
  Use the shop's terminology (sqft, GPM, GP, etc.).`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory.concat([{ role: 'user', content: message }]),
  })

  return Response.json({ response: response.content[0].text })
}
```

---

## 27. GAMIFICATION SYSTEM

### XP Values (configurable in Settings → Gamification)

| Action | XP | Notes |
|--------|--:|-------|
| Daily login | 5 | Streak bonus: +1 per consecutive day, caps at +10 |
| Create lead | 10 | |
| Send onboarding link | 5 | |
| Customer submits intake | 15 | Awarded to agent who sent the link |
| Close deal (won) | 100 | |
| Lost deal | 5 | "Learning from loss" |
| Create design | 10 | |
| Design approved (no revisions) | 50 | Bonus for first-try approval |
| Design approved (with revisions) | 30 | |
| Production brief completed | 15 | |
| Customer sign-off received | 20 | |
| Print job completed | 15 | |
| Install completed | 25 | |
| Job fully completed | 75 | |
| Invoice paid | 30 | |
| Upload to media library | 5 | |
| Log expense | 3 | |
| Installer bid submitted | 5 | |
| Maintenance logged | 10 | |

### Levels

```
Level 1:  0 XP      Level 11: 2000 XP    Level 21: 8000 XP    Level 31: 20000 XP   Level 41: 40000 XP
Level 2:  50 XP     Level 12: 2500 XP    Level 22: 9000 XP    Level 32: 22500 XP   Level 42: 45000 XP
Level 3:  150 XP    Level 13: 3000 XP    Level 23: 10000 XP   Level 33: 25000 XP   Level 43: 50000 XP
Level 4:  300 XP    Level 14: 3500 XP    Level 24: 11000 XP   Level 34: 27500 XP   Level 44: 55000 XP
Level 5:  500 XP    Level 15: 4000 XP    Level 25: 12500 XP   Level 35: 30000 XP   Level 45: 60000 XP
Level 6:  750 XP    Level 16: 4500 XP    Level 26: 14000 XP   Level 36: 32500 XP   Level 46: 65000 XP
Level 7:  1000 XP   Level 17: 5000 XP    Level 27: 15500 XP   Level 37: 35000 XP   Level 47: 70000 XP
Level 8:  1250 XP   Level 18: 5500 XP    Level 28: 17000 XP   Level 38: 37500 XP   Level 48: 75000 XP
Level 9:  1500 XP   Level 19: 6000 XP    Level 29: 18500 XP   Level 39: 40000 XP   Level 49: 80000 XP
Level 10: 1750 XP   Level 20: 7000 XP    Level 30: 20000 XP   Level 40: 42500 XP   Level 50: 100000 XP
```

### Badges

| Badge | Condition |
|-------|-----------|
| 🔥 Hot Streak | 7-day login streak |
| 💰 Closer | 10 deals closed |
| 🎯 Sharpshooter | 5 deals closed with >50% GPM |
| 🎨 Pixel Perfect | 5 designs approved without revisions |
| ⚡ Speed Demon | Job completed 2+ days ahead of schedule |
| 🏆 Top Dog | #1 on monthly leaderboard |
| 📸 Shutterbug | 50 photos uploaded to media library |
| 🧹 Zero Waste | Print job with <2% material waste |
| 🤝 Team Player | 5 cross-division referrals |
| 💎 Elite | Reach Level 25 |

### XP Award Function

```typescript
// lib/gamification.ts
export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  sourceType?: string,
  sourceId?: string
) {
  // Record in ledger
  await supabase.from('xp_ledger').insert({
    user_id: userId, amount, reason, source_type: sourceType, source_id: sourceId
  })

  // Update profile totals
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level, current_streak, monthly_xp, weekly_xp')
    .eq('id', userId)
    .single()

  if (!profile) return

  const newXP = profile.xp + amount
  const newLevel = calculateLevel(newXP)  // find highest level threshold ≤ newXP
  const leveledUp = newLevel > profile.level

  await supabase.from('profiles').update({
    xp: newXP,
    level: newLevel,
    monthly_xp: profile.monthly_xp + amount,
    weekly_xp: profile.weekly_xp + amount,
  }).eq('id', userId)

  return { newXP, newLevel, leveledUp, amount }
}
```

### Leaderboard Page (`/leaderboard`)

Table of all team members ranked by XP (monthly, weekly, all-time). Shows level, badge count, streak, and trend (up/down from last week).

---

## 28. SALES VELOCITY & AI FORECASTING

### What Is Sales Velocity

Sales velocity measures how fast you're making money:

```
Velocity = (# Opportunities × Win Rate × Avg Deal Size) ÷ Avg Sales Cycle Length
```

### Dashboard Widget — Velocity Gauge

A circular gauge showing:
- Current monthly revenue pace vs. target
- Green (on/above pace), Yellow (80-100%), Red (below 80%)
- Projected month-end total based on current pace

### AI Forecast Route (`/api/ai/sales-forecast`)

Weekly, the system sends Claude the last 90 days of sales data:
- Number of leads per week
- Conversion rates by stage
- Average deal size
- Average time in each pipeline stage
- Win/loss rates
- Revenue by week

Claude returns:
```json
{
  "projected_monthly_revenue": 42500,
  "confidence": "medium",
  "pace_status": "slightly_behind",
  "insights": [
    "Lead volume is up 15% but conversion from qualified → proposal is down 8%",
    "Average deal size increased by $200 — focus on maintaining this",
    "3 leads in negotiating have been there 10+ days — push for close"
  ],
  "recommendations": [
    "Follow up with the 3 stalled negotiating leads this week",
    "Consider a promotion to boost proposal-to-close conversion",
    "Schedule 2 additional outbound calls per day to offset conversion dip"
  ],
  "risk_deals": ["WQ-xxx", "WQ-yyy"],
  "hot_deals": ["WQ-zzz"]
}
```

The Genie surfaces these insights proactively on the dashboard.

---

## 29. SETTINGS & ADMIN (PIN-LOCKED)

### Settings Page Structure

| Section | PIN-Locked? | Description |
|---------|:-----------:|-------------|
| General | No | Company name, logo, timezone, date format |
| Team | No | Manage team members, assign roles |
| Defaults | **Yes** | All default values (rates, fees, thresholds) |
| Shop Expenses | **Yes** | Monthly overhead tracking |
| Commissions | **Yes** | Commission rate rules for all sources |
| Pricing Rules | No | Pricing formulas, rush fees, material markups |
| Gamification | No | XP values, level thresholds, badges |
| Integrations | **Yes** | API keys, Stripe, webhook URLs |

### PIN Lock

Locked sections require entering a 4–6 digit PIN before access. The PIN is set by the owner and stored as a bcrypt hash in `profiles.pin_hash`. Anyone with `owner` or `admin` role can access locked sections after entering the PIN.

### Defaults Page (`/settings/defaults`)

All the configurable defaults in one place, organized by category:

**Pricing Defaults:**
- Design fee: $150
- Material rate: $2.10/sqft
- Tax rate: 10%
- Installer billing rate: $35/hr
- Design canvas payment: $250
- Rush fees: standard/5-day/3-day/48hr/24hr amounts

**Commission Defaults:**
- Inbound rate: 4.5%
- Outbound rate: 6%
- Referral rate: 5%
- Walk-in rate: 4.5%
- Repeat rate: 4%
- Cross-referral rate: 2.5%
- Production bonus rate: 5%

**Design Defaults:**
- Max revisions: 2
- Onboarding link expiry: 30 days

**Production Defaults:**
- Default drying time: 30 min
- Printer maintenance interval: 100 hours

### Shop Expenses Page (`/settings/shop-expenses`)

Track monthly overhead costs. Supports recurring entries:

```
┌──────────────────────────────────────────────────────────────┐
│ 🏪 SHOP EXPENSES                        [+ Add Expense]     │
│                                                              │
│ THIS MONTH: $8,450                                           │
│                                                              │
│ Category       Description           Amount   Recurring      │
│ Rent           Shop lease             $3,200   Monthly       │
│ Utilities      Electric + water       $480     Monthly       │
│ Insurance      General liability      $350     Monthly       │
│ Equipment      Printer lease          $1,200   Monthly       │
│ Software       Subscriptions          $220     Monthly       │
│ Marketing      Google Ads             $800     Monthly       │
│ Supplies       General shop supplies  $400     As-needed     │
│ Vehicle        Van gas + maintenance  $350     Monthly       │
│ Payroll OH     Benefits, taxes        $1,450   Monthly       │
│                                                              │
│ 📊 Monthly overhead breakdown chart (pie)                    │
│ 📈 Trend: $8,450 this month vs $8,200 last month (+3%)      │
└──────────────────────────────────────────────────────────────┘
```

### Other Locked Settings Ideas

- **Profit targets** — Monthly/quarterly revenue and profit goals
- **Margin thresholds** — Minimum acceptable GPM (alert if job is below)
- **Installer rate caps** — Maximum hourly rate for bids
- **Material markup rules** — Standard markup percentages
- **Discount approval thresholds** — Discounts above X% require owner approval

---

## 30. CUSTOMER-FACING PORTAL

Separate route group with its own clean layout. No sidebar.

### Routes

- `/portal/[token]` — Onboarding intake form
- `/portal/[token]/design` — Design canvas (post-payment)
- `/portal/[token]/signoff` — Production brief sign-off
- `/portal/[token]/status` — Job tracking

### Flow

1. Customer clicks link → sees welcome message + intake form
2. Fills in company info, vehicle details, wrap preferences, uploads brand files
3. Pays $250 via Stripe Checkout (if required)
4. Gets access to design canvas where they can pre-design their wrap
5. Submits design → team is notified
6. (Later) Receives sign-off link to approve production brief
7. Can check status anytime via `/portal/[token]/status`

---

## 31. API ROUTES — COMPLETE REFERENCE

All routes use App Router convention (`route.ts` with named exports).

### AI Routes

#### `POST /api/ai/analyze-brand`
Claude Opus vision analysis of uploaded brand materials.
- Input: `{ jobId, images: [{ base64, mediaType }] }`
- Process: Sends images to Claude with wrap-specific analysis prompt
- Output: `{ design_style, color_psychology, layout_suggestions, complexity_score, vehicle_recommendations, readability_notes, potential_risks }`
- Side effect: Updates `jobs.ai_recommendations` and `jobs.design_complexity_score`

#### `POST /api/ai/calculate-pricing`
Claude Opus pricing engine with configurable rules.
- Input: `{ vehicleType, coverage, complexity, material, timeline, fleetSize? }`
- System prompt contains all pricing rules from `app_settings`
- Output: Itemized breakdown matching the financial section of the Sales Order PDF
- Side effect: Updates `jobs.ai_pricing`

#### `POST /api/ai/design-feedback`
Real-time design QA as designer works on canvas (debounced 3s).
- Input: `{ canvasData, vehicleType }`
- Output: `{ issues: [{ type, severity, element, issue, suggestion }], overall_rating, ready_for_production }`

#### `POST /api/ai/generate-mockup`
Two-step: Claude generates image prompt → Replicate generates image.
- Input: `{ jobId?, designId?, vehicleType, brandName, canvasData, options: { angle, environment, lighting } }`
- Output: `{ mockupUrl }`
- Side effect: Creates `mockups` row, stores image in Supabase Storage

#### `POST /api/ai/genie-chat`
Conversational AI for the Genie assistant.
- Input: `{ message, context: { page, entityType, entityId, userData }, history }`
- Uses Claude Sonnet for speed
- Output: `{ response, suggestedActions? }`

#### `POST /api/ai/genie-suggestion`
Background job that generates proactive suggestions.
- Called by cron or realtime trigger
- Analyzes: overdue follow-ups, stalled jobs, low ink, maintenance due, remnant matches, velocity drops
- Creates `genie_suggestions` rows

#### `POST /api/ai/sales-forecast`
Weekly AI analysis of sales pipeline health.
- Input: Last 90 days of sales data (auto-pulled)
- Output: Forecast, insights, recommendations (see Section 28)

#### `POST /api/ai/similar-photos`
Find similar completed work for proposals.
- Input: `{ vehicleType, wrapType, description, colors }`
- Output: `{ photos: [{ id, url, similarity_score, match_reason }] }`

#### `POST /api/ai/material-match`
Match inventory remnants to job requirements.
- Input: `{ jobId, panels: [{ name, sqft, material }] }`
- Output: `{ matches: [{ remnantId, panel, fit_assessment }] }`

### Payment Routes

#### `POST /api/payments/create-checkout`
Creates Stripe Checkout session for customer design canvas payment.
- Input: `{ onboardingLinkId, email }`
- Output: `{ sessionId, url }`

#### `POST /api/payments/webhook`
Stripe webhook handler. Validates signature, processes `checkout.session.completed`.
- Updates `onboarding_links.payment_status`
- Awards XP to the agent who sent the link

### Report Routes

#### `GET /api/reports/sales-order?jobId=xxx`
Generates Sales Order PDF matching page 1 of the uploaded PDF format.

#### `GET /api/reports/production-brief?jobId=xxx`
Generates Production Brief PDF matching page 2.

#### `GET /api/reports/installer-work-order?jobId=xxx`
Generates Installer Work Order PDF matching pages 3–4, including the liability agreement and signature section.

### Media Routes

#### `POST /api/media/upload`
Handles file upload → Supabase Storage → creates `media_files` row → triggers AI tagging.

### Inventory Routes

#### `POST /api/inventory/consume-roll`
Marks a roll as consumed, records final waste, updates stats.

#### `POST /api/inventory/match-remnant`
Finds available remnants matching job requirements.

---

## 32. DEPLOYMENT

```bash
# Initialize project
npx create-next-app@latest wrapshop-pro --typescript --tailwind --app --src-dir=false
cd wrapshop-pro

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install stripe
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install @tanstack/react-table
npm install recharts
npm install @react-pdf/renderer
npm install fabric
npm install react-signature-canvas
npm install date-fns
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input select table tabs toast badge avatar separator sheet command popover calendar

# Set environment variables in Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY
# STRIPE_SECRET_KEY
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# STRIPE_WEBHOOK_SECRET
# REPLICATE_API_TOKEN
# NEXT_PUBLIC_APP_URL

# Deploy
vercel --prod
```

---

## 33. IMPLEMENTATION ORDER

Build in this exact order. Each phase builds on the previous.

### Phase 1: Foundation (Days 1–3)
1. Initialize Next.js project with TypeScript + Tailwind + shadcn
2. Run complete database schema in Supabase SQL Editor
3. Set up Supabase Storage buckets
4. Configure Supabase Auth (Google OAuth + email)
5. Implement auth: login, signup, callback, middleware
6. Build the PERSISTENT APP SHELL (layout, sidebar, topbar) — test that sidebar never disappears
7. Create the `lib/` utilities (supabase clients, permissions, constants)

### Phase 2: Core Data & Navigation (Days 4–6)
8. Profiles page (team management in settings)
9. Customer CRUD
10. Leads/Sales pipeline (Kanban board + list view)
11. Onboarding link generator (positioned at TOP of sales page)
12. Job CRUD with status management
13. Dashboard — basic stats + job cards with inline actions

### Phase 3: Design & Media (Days 7–10)
14. Design Studio — create/list/link designs
15. Fabric.js canvas page (inside app shell)
16. Bidirectional design ↔ job linking
17. Media library (upload, grid, tags)
18. AI auto-tagging on upload (`/api/ai/analyze-brand` adapted)
19. Customer intake portal (`/portal/[token]`)
20. Customer uploads → media library flow

### Phase 4: Production & Inventory (Days 11–14)
21. Material inventory (rolls, add, update remaining, consume)
22. Material remnants (cut, track, search)
23. Print job scheduling + calendar view
24. Printer management + maintenance log
25. Production brief generation
26. Customer sign-off workflow + portal page

### Phase 5: Installers & Bids (Days 15–17)
27. Installer bid board
28. Bid submission + acceptance flow
29. Time logger
30. Liability sign-off with signature pad
31. Installer Work Order PDF generation

### Phase 6: AI Integration (Days 18–21)
32. `/api/ai/analyze-brand` — Claude vision brand analysis
33. `/api/ai/calculate-pricing` — Claude pricing engine
34. `/api/ai/design-feedback` — real-time design QA
35. `/api/ai/generate-mockup` — image generation (customer + internal)
36. Internal mockup tool page
37. `/api/ai/similar-photos` — media library recommendations
38. `/api/ai/material-match` — remnant matching
39. `/api/ai/sales-forecast` — velocity + forecasting

### Phase 7: AI Genie (Days 22–24)
40. Genie provider + state management
41. GenieFAB + ChatDrawer
42. `/api/ai/genie-chat` — conversational AI
43. GenieInlineSuggestion component
44. `/api/ai/genie-suggestion` — proactive suggestion engine
45. Wire Genie into every major page with context

### Phase 8: Gamification (Days 25–27)
46. XP award system (`lib/gamification.ts`)
47. Wire XP awards into all actions (lead created, deal closed, etc.)
48. XP toast notifications
49. Level-up celebration modal
50. Streak tracking (daily login)
51. Badge system
52. Leaderboard page

### Phase 9: Reports & Finance (Days 28–30)
53. Sales Order PDF (matching uploaded PDF page 1)
54. Production Brief PDF (page 2)
55. Installer Work Order PDF (pages 3–4)
56. Customer Report PDF
57. Commission calculation engine wired into jobs
58. Role-based employee dashboards (Section 10)
59. Shop expenses page (PIN-locked)
60. Settings defaults page (PIN-locked)

### Phase 10: Payments & Polish (Days 31–35)
61. Stripe Checkout integration
62. Stripe webhook handler
63. Customer expense quick-add
64. Cross-referral commission tracking
65. Sales velocity gauge on dashboard
66. Activity feed
67. Responsive design pass
68. Error handling + loading states everywhere
69. Realtime subscriptions (dashboard, bids, print status)
70. Final QA — test every flow end-to-end

---

## 34. CRITICAL BUG FIXES FROM PREVIOUS BUILD

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | **Sidebar disappears on detail pages** | Pages were outside the `(app)` route group, or used full-page layouts | ALL internal pages under `app/(app)/...`. The `(app)/layout.tsx` is the persistent shell. |
| 2 | **"No account available" on Google Auth** | No `profiles` row created for new OAuth users | `handle_new_user()` trigger on `auth.users` with `ON CONFLICT` safety (Section 5A) |
| 3 | **Dashboard dropdown pushes content down** | Three-dot menu opened a dropdown below the card | Replace with inline expansion on the same row (Section 9) |
| 4 | **Onboarding link generator buried in sales** | Was in a sub-section or modal, hard to find | Move to TOP of sales page as the first, most prominent element (Section 11) |
| 5 | **"Add Design" doesn't populate brief** | Design created with empty brief fields | When creating a design linked to a job, COPY all brief data from the job (Section 15) |
| 6 | **Features bugging out generally** | Pages navigating outside app shell, state lost | All navigation stays inside `(app)` group. Use Zustand for persistent state. |

---

## 35. LOGICAL FLOW VERIFICATION

### End-to-End Flow: New Lead → Paid Invoice

```
1. Sales agent creates lead in pipeline                    [+10 XP]
2. Agent generates onboarding link                         [+5 XP]
3. Agent sends link to customer (email/SMS/copy)
4. Customer opens link → views++ on onboarding_links
5. Customer fills intake form → uploads brand materials
6. Files saved to Supabase Storage + media_files table
7. Customer pays $250 → Stripe webhook → payment_status = 'completed'  [+15 XP to agent]
8. Customer uses design canvas → submits pre-design
9. Agent marks lead as "won"                               [+100 XP]
10. Job auto-created from lead data + customer data
11. Brand materials trigger AI analysis → recommendations saved to job
12. Designer creates design (brief auto-populated from job) [+10 XP]
13. Designer works on Fabric.js canvas, AI gives real-time feedback
14. Design submitted for review → approved                  [+30-50 XP]
15. Production manager reviews job, fills measurements/panels
16. Production brief PDF generated
17. Customer sign-off link sent → customer views in portal
18. Customer approves (digital signature)                   [+20 XP]
19. Job status → approved → print_queue
20. Production schedules print job on calendar
21. Material roll selected from inventory (remnant check first!)
22. Print job: queued → prepping → printing → drying → laminating → done  [+15 XP]
23. Material roll remaining_length updated, waste logged
24. Job status → bid_open
25. Installers see job on bid board, submit bids            [+5 XP per bid]
26. Production accepts best bid → installer_pay set
27. Job status → scheduled, install_date set
28. Installer receives Work Order PDF + liability agreement
29. Install day: installer signs liability form (digital)
30. Installer logs hours during install
31. Job status → in_progress → quality_check → completed   [+25 XP installer, +75 XP job]
32. Invoice generated, sent to customer
33. Customer pays → job status → paid                       [+30 XP]
34. Agent commission, cross-referral commission, production bonus all calculated
35. Photos of completed work uploaded to media library       [+5 XP each]
36. AI auto-tags photos for future similar-job recommendations
```

### Cross-Referral Flow

```
1. Wraps agent talking to customer who also needs deck coating
2. Agent creates a NEW lead under "decking" division
3. Sets referred_by = themselves, referral_from_division = 'wraps'
4. Lead assigned to a decking agent
5. Decking agent works the lead, closes deal
6. On job completion/payment, cross_referral_commission calculated:
   = net_profit × cross_referral_rate (default 2.5%)
7. Original wraps agent sees this on their dashboard under "Cross-Referral Bonus"
8. Works the same in reverse: decking → wraps
```

### Material Lifecycle

```
1. New roll purchased → added to inventory (status: in_stock)
2. Roll assigned to print job → status: in_use
3. As material is used, production updates remaining_length
4. If usable piece left after job → "Cut Remnant" → creates material_remnant
5. When roll is empty → "Consume" → status: consumed, waste logged
6. Remnant sits in inventory with status: available
7. When quoting new job → Genie/system checks for matching remnants
8. If match found → suggest using remnant (saves money + reduces waste!)
9. Remnant used → status: consumed
```

### Printer Maintenance Lifecycle

```
1. Printer tracks total_sqft_printed and total_print_hours
2. maintenance_interval_hours setting (default: 100h)
3. When print_hours since last maintenance approaches threshold → Genie alert
4. Production logs maintenance → creates printer_maintenance_log entry
5. Printer.last_maintenance_date and next_maintenance_date updated
6. Ink levels manually updated after checking → low ink triggers Genie alert
7. Nozzle checks tracked by date → overdue check triggers Genie alert
```

---

## END OF SPECIFICATION

This document defines the complete WrapShop Pro system. Every feature, every table, every API route, every workflow is specified. Build it phase by phase following Section 33. The AI Genie, gamification, and financial tracking are what make this system special — they turn a boring shop management tool into something the team actually wants to use every day.

**Remember the three golden rules:**
1. The sidebar NEVER disappears.
2. Money flow is the #1 priority for every role's dashboard.
3. Gamify everything — if someone does something in the app, they earn XP for it.
