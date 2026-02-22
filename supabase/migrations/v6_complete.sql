-- ============================================================================
-- USA WRAP CO — v6 COMPLETE MIGRATION
-- A single, idempotent migration that can be run on a fresh Supabase database.
-- All tables use CREATE TABLE IF NOT EXISTS; all policies use DROP IF EXISTS
-- before CREATE so the script is safe to re-run.
--
-- Org ID: d34a6c47-1ac0-4008-87d2-0f7741eebc4f
-- Generated: 2026-02-21
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  0. EXTENSIONS                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() / gen_random_bytes()

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. UTILITY FUNCTIONS                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Generic set_updated_at trigger function (reused by many tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. FOUNDATIONAL TABLES                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Orgs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orgs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL DEFAULT '',
  logo_url   TEXT,
  settings   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select" ON public.orgs;
CREATE POLICY "orgs_select" ON public.orgs FOR SELECT USING (true);

DROP POLICY IF EXISTS "orgs_update" ON public.orgs;
CREATE POLICY "orgs_update" ON public.orgs FOR UPDATE USING (
  id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- Seed the default org
INSERT INTO public.orgs (id, name)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'USA Wrap Co')
ON CONFLICT (id) DO NOTHING;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY,  -- matches auth.users.id
  org_id          UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  email           TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('owner','admin','sales_agent','designer','production','installer','viewer')),
  active          BOOLEAN NOT NULL DEFAULT true,
  permissions     JSONB NOT NULL DEFAULT '{}',
  division        TEXT DEFAULT 'both',
  last_active_date DATE,
  max_active_bids INTEGER DEFAULT 5,
  -- Gamification / XP
  xp              INTEGER DEFAULT 0,
  level           INTEGER DEFAULT 1,
  current_streak  INTEGER DEFAULT 0,
  longest_streak  INTEGER DEFAULT 0,
  monthly_xp      INTEGER DEFAULT 0,
  weekly_xp       INTEGER DEFAULT 0,
  badges          JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_org    ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email  ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (
  id = auth.uid()
  OR org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- ─── Customers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  contact_name    TEXT NOT NULL DEFAULT '',
  company_name    TEXT,
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  city            TEXT,
  state           TEXT,
  address         TEXT,
  source          TEXT DEFAULT 'inbound',
  notes           TEXT,
  referral_source TEXT,
  referred_by     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  fleet_size      INTEGER DEFAULT 0,
  lifetime_spend  NUMERIC(12,2) DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_org  ON public.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(contact_name);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. PROJECTS (core job table)                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  type                TEXT NOT NULL DEFAULT 'wrap'
                      CHECK (type IN ('wrap','decking','design','ppf')),
  title               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'estimate'
                      CHECK (status IN ('estimate','active','in_production','install_scheduled',
                                        'installed','qc','closing','closed','cancelled')),
  customer_id         UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  agent_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  installer_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_step_id     UUID,
  priority            TEXT NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('low','normal','high','urgent')),
  vehicle_desc        TEXT,
  install_date        DATE,
  due_date            DATE,
  revenue             NUMERIC(12,2),
  profit              NUMERIC(12,2),
  gpm                 NUMERIC(5,2),
  commission          NUMERIC(12,2),
  division            TEXT NOT NULL DEFAULT 'wraps'
                      CHECK (division IN ('wraps','decking')),
  pipe_stage          TEXT NOT NULL DEFAULT 'sales_in'
                      CHECK (pipe_stage IN ('sales_in','production','install','prod_review','sales_close','done')),
  form_data           JSONB NOT NULL DEFAULT '{}',
  fin_data            JSONB,
  actuals             JSONB NOT NULL DEFAULT '{}',
  checkout            JSONB NOT NULL DEFAULT '{}',
  installer_bid       JSONB,
  send_backs          JSONB NOT NULL DEFAULT '[]',
  referral            TEXT,
  referral_agent_id   UUID,
  -- Actuals columns added by sprint1
  actual_hours        NUMERIC,
  actual_cost         NUMERIC,
  installer_signature TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org       ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status    ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_agent     ON public.projects(agent_id);
CREATE INDEX IF NOT EXISTS idx_projects_installer ON public.projects(installer_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer  ON public.projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_pipe      ON public.projects(pipe_stage);
CREATE INDEX IF NOT EXISTS idx_projects_division  ON public.projects(division);
CREATE INDEX IF NOT EXISTS idx_projects_updated   ON public.projects(updated_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. TASKS                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'manual'
              CHECK (type IN ('manual','auto','ai_suggested','reminder')),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','in_progress','done','dismissed')),
  priority    TEXT NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('urgent','high','normal','low')),
  due_at      TIMESTAMPTZ,
  done_at     TIMESTAMPTZ,
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org        ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project    ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON public.tasks(status);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. JOB COMMENTS (Chat)                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.job_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  channel     TEXT DEFAULT 'general',
  message     TEXT,
  image_url   TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_comments_project  ON public.job_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_job_comments_channel  ON public.job_comments(project_id, channel);
CREATE INDEX IF NOT EXISTS idx_job_comments_user     ON public.job_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_job_comments_created  ON public.job_comments(created_at DESC);

ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_comments_select" ON public.job_comments;
CREATE POLICY "job_comments_select" ON public.job_comments FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_comments_insert" ON public.job_comments;
CREATE POLICY "job_comments_insert" ON public.job_comments FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_comments_update" ON public.job_comments;
CREATE POLICY "job_comments_update" ON public.job_comments FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. JOB IMAGES                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.job_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category      TEXT DEFAULT 'general',
  image_url     TEXT,
  public_url    TEXT,
  storage_path  TEXT,
  file_name     TEXT,
  file_size     INTEGER,
  mime_type     TEXT,
  vehicle_type  TEXT,
  wrap_scope    TEXT,
  tags          JSONB DEFAULT '[]',
  ai_tags       JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_images_project  ON public.job_images(project_id);
CREATE INDEX IF NOT EXISTS idx_job_images_user     ON public.job_images(user_id);
CREATE INDEX IF NOT EXISTS idx_job_images_category ON public.job_images(category);

ALTER TABLE public.job_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_images_select" ON public.job_images;
CREATE POLICY "job_images_select" ON public.job_images FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_images_insert" ON public.job_images;
CREATE POLICY "job_images_insert" ON public.job_images FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_images_update" ON public.job_images;
CREATE POLICY "job_images_update" ON public.job_images FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_images_delete" ON public.job_images;
CREATE POLICY "job_images_delete" ON public.job_images FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. SPRINT 1: Approval Pipeline, Install Tracking, Material Tracking    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Stage Approvals ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stage_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  checklist   JSONB DEFAULT '{}',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_stage_approvals_project ON public.stage_approvals(project_id, stage);

ALTER TABLE public.stage_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stage_approvals_select" ON public.stage_approvals;
CREATE POLICY "stage_approvals_select" ON public.stage_approvals FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "stage_approvals_insert" ON public.stage_approvals;
CREATE POLICY "stage_approvals_insert" ON public.stage_approvals FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "stage_approvals_update" ON public.stage_approvals;
CREATE POLICY "stage_approvals_update" ON public.stage_approvals FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Send-Backs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.send_backs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_stage    TEXT NOT NULL,
  to_stage      TEXT NOT NULL,
  reason        TEXT NOT NULL,
  reason_detail TEXT,
  sent_by       UUID NOT NULL,
  resolved      BOOLEAN DEFAULT false,
  resolved_by   UUID,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_send_backs_project ON public.send_backs(project_id);
CREATE INDEX IF NOT EXISTS idx_send_backs_org     ON public.send_backs(org_id);

ALTER TABLE public.send_backs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "send_backs_select" ON public.send_backs;
CREATE POLICY "send_backs_select" ON public.send_backs FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "send_backs_insert" ON public.send_backs;
CREATE POLICY "send_backs_insert" ON public.send_backs FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "send_backs_update" ON public.send_backs;
CREATE POLICY "send_backs_update" ON public.send_backs FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Install Sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.install_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id     UUID NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_install_sessions_project   ON public.install_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_install_sessions_installer ON public.install_sessions(installer_id);

ALTER TABLE public.install_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "install_sessions_select" ON public.install_sessions;
CREATE POLICY "install_sessions_select" ON public.install_sessions FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "install_sessions_insert" ON public.install_sessions;
CREATE POLICY "install_sessions_insert" ON public.install_sessions FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "install_sessions_update" ON public.install_sessions;
CREATE POLICY "install_sessions_update" ON public.install_sessions FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Material Tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.material_tracking (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quoted_sqft           NUMERIC,
  actual_sqft           NUMERIC,
  linear_ft_printed     NUMERIC,
  print_width_inches    NUMERIC DEFAULT 54,
  buffer_pct            NUMERIC,
  material_type         TEXT,
  actual_material_cost  NUMERIC,
  actual_installer_pay  NUMERIC,
  actual_design_fee     NUMERIC,
  actual_hours          NUMERIC,
  actual_sale_price     NUMERIC,
  notes                 TEXT,
  logged_by             UUID,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_material_tracking_project ON public.material_tracking(project_id);

ALTER TABLE public.material_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_tracking_select" ON public.material_tracking;
CREATE POLICY "material_tracking_select" ON public.material_tracking FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "material_tracking_insert" ON public.material_tracking;
CREATE POLICY "material_tracking_insert" ON public.material_tracking FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "material_tracking_update" ON public.material_tracking;
CREATE POLICY "material_tracking_update" ON public.material_tracking FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. SPRINT 2B: Customer Portal, Proofing, Bids, Referrals, Visibility  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Customer Intake ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_intake (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token               TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  customer_name       TEXT,
  customer_email      TEXT,
  customer_phone      TEXT,
  vehicle_photos      JSONB DEFAULT '[]',
  logo_files          JSONB DEFAULT '[]',
  brand_colors        TEXT,
  brand_fonts         TEXT,
  design_brief        TEXT,
  text_content        TEXT,
  references_notes    TEXT,
  removal_required    BOOLEAN DEFAULT false,
  removal_description TEXT,
  completed           BOOLEAN DEFAULT false,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_token   ON public.customer_intake(token);
CREATE INDEX IF NOT EXISTS idx_intake_project ON public.customer_intake(project_id);

ALTER TABLE public.customer_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_intake_select" ON public.customer_intake;
CREATE POLICY "customer_intake_select" ON public.customer_intake FOR SELECT USING (true);

DROP POLICY IF EXISTS "customer_intake_update" ON public.customer_intake;
CREATE POLICY "customer_intake_update" ON public.customer_intake FOR UPDATE USING (true);

DROP POLICY IF EXISTS "customer_intake_insert" ON public.customer_intake;
CREATE POLICY "customer_intake_insert" ON public.customer_intake FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  OR true  -- allow public inserts via onboarding flow
);

-- ─── Design Proofs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_proofs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id             UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number         INTEGER NOT NULL DEFAULT 1,
  image_url              TEXT NOT NULL,
  thumbnail_url          TEXT,
  designer_notes         TEXT,
  customer_status        TEXT DEFAULT 'pending',
  customer_feedback      TEXT,
  customer_approved_at   TIMESTAMPTZ,
  customer_name_confirm  TEXT,
  responsibility_accepted BOOLEAN DEFAULT false,
  sent_at                TIMESTAMPTZ DEFAULT now(),
  sent_by                UUID,
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proofs_project ON public.design_proofs(project_id);

ALTER TABLE public.design_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_proofs_select" ON public.design_proofs;
CREATE POLICY "design_proofs_select" ON public.design_proofs FOR SELECT USING (true);

DROP POLICY IF EXISTS "design_proofs_update" ON public.design_proofs;
CREATE POLICY "design_proofs_update" ON public.design_proofs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "design_proofs_insert" ON public.design_proofs;
CREATE POLICY "design_proofs_insert" ON public.design_proofs FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Proof Settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proof_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  max_revisions   INTEGER DEFAULT 3,
  revisions_used  INTEGER DEFAULT 0,
  proofing_token  TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_settings_project ON public.proof_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_proof_settings_token   ON public.proof_settings(proofing_token);

ALTER TABLE public.proof_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proof_settings_select" ON public.proof_settings;
CREATE POLICY "proof_settings_select" ON public.proof_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "proof_settings_update" ON public.proof_settings;
CREATE POLICY "proof_settings_update" ON public.proof_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "proof_settings_insert" ON public.proof_settings;
CREATE POLICY "proof_settings_insert" ON public.proof_settings FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Designer Bids ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.designer_bids (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  designer_id    UUID NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  is_first_choice BOOLEAN DEFAULT false,
  package_data   JSONB DEFAULT '{}',
  counter_terms  TEXT,
  accepted_at    TIMESTAMPTZ,
  declined_at    TIMESTAMPTZ,
  deadline       TIMESTAMPTZ,
  bid_expires_at TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designer_bids_project  ON public.designer_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_designer_bids_designer ON public.designer_bids(designer_id);

ALTER TABLE public.designer_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "designer_bids_select" ON public.designer_bids;
CREATE POLICY "designer_bids_select" ON public.designer_bids FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "designer_bids_insert" ON public.designer_bids;
CREATE POLICY "designer_bids_insert" ON public.designer_bids FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "designer_bids_update" ON public.designer_bids;
CREATE POLICY "designer_bids_update" ON public.designer_bids FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Designer Specialties ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.designer_specialties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL,
  specialty   TEXT NOT NULL,
  UNIQUE(designer_id, specialty)
);

ALTER TABLE public.designer_specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "designer_specialties_select" ON public.designer_specialties;
CREATE POLICY "designer_specialties_select" ON public.designer_specialties FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "designer_specialties_all" ON public.designer_specialties;
CREATE POLICY "designer_specialties_all" ON public.designer_specialties FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Installer Bids ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.installer_bids (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id       UUID NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',
  pay_amount         NUMERIC,
  hours_budget       NUMERIC,
  accepted_at        TIMESTAMPTZ,
  declined_at        TIMESTAMPTZ,
  liability_accepted BOOLEAN DEFAULT false,
  bid_expires_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installer_bids_project   ON public.installer_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_installer ON public.installer_bids(installer_id);

ALTER TABLE public.installer_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installer_bids_select" ON public.installer_bids;
CREATE POLICY "installer_bids_select" ON public.installer_bids FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "installer_bids_insert" ON public.installer_bids;
CREATE POLICY "installer_bids_insert" ON public.installer_bids FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "installer_bids_update" ON public.installer_bids;
CREATE POLICY "installer_bids_update" ON public.installer_bids FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Referrals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  referring_agent_id UUID NOT NULL,
  receiving_agent_id UUID NOT NULL,
  referrer_id        UUID,  -- used by gamification
  referral_type      TEXT NOT NULL DEFAULT 'percentage',
  referral_rate      NUMERIC,
  flat_amount        NUMERIC,
  from_division      TEXT,
  to_division        TEXT,
  commission_earned  NUMERIC,
  paid               BOOLEAN DEFAULT false,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_project   ON public.referrals(project_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referring ON public.referrals(referring_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_receiving ON public.referrals(receiving_agent_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select" ON public.referrals;
CREATE POLICY "referrals_select" ON public.referrals FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "referrals_insert" ON public.referrals;
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "referrals_update" ON public.referrals;
CREATE POLICY "referrals_update" ON public.referrals FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "referrals_delete" ON public.referrals;
CREATE POLICY "referrals_delete" ON public.referrals FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Visibility Settings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visibility_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  sales_sees_production    BOOLEAN DEFAULT true,
  sales_sees_install       BOOLEAN DEFAULT true,
  production_sees_install  BOOLEAN DEFAULT true,
  install_sees_production  BOOLEAN DEFAULT false,
  assigned_only_sales      BOOLEAN DEFAULT false,
  assigned_only_install    BOOLEAN DEFAULT true,
  assigned_only_production BOOLEAN DEFAULT false,
  divisions_enabled        BOOLEAN DEFAULT true,
  division_list            JSONB DEFAULT '["wrap","decking"]',
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visibility_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visibility_settings_select" ON public.visibility_settings;
CREATE POLICY "visibility_settings_select" ON public.visibility_settings FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "visibility_settings_all" ON public.visibility_settings;
CREATE POLICY "visibility_settings_all" ON public.visibility_settings FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Seed default visibility settings for the org
INSERT INTO public.visibility_settings (org_id)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f')
ON CONFLICT (org_id) DO NOTHING;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. v6 MIGRATION: Estimates, Sales Orders, Invoices, Line Items         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Estimates ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estimates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  estimate_number       SERIAL,
  title                 TEXT NOT NULL DEFAULT '',
  customer_id           UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','accepted','expired','rejected','void')),
  sales_rep_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  production_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_manager_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  quote_date            DATE,
  due_date              DATE,
  subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate              NUMERIC(5,4) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes                 TEXT,
  customer_note         TEXT,
  division              TEXT NOT NULL DEFAULT 'wraps'
                        CHECK (division IN ('wraps','decking')),
  form_data             JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimates_org       ON public.estimates(org_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer  ON public.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status    ON public.estimates(status);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estimates_updated_at ON public.estimates;
CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION update_estimates_updated_at();

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimates_select" ON public.estimates;
CREATE POLICY "estimates_select" ON public.estimates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "estimates_insert" ON public.estimates;
CREATE POLICY "estimates_insert" ON public.estimates FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "estimates_update" ON public.estimates;
CREATE POLICY "estimates_update" ON public.estimates FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "estimates_delete" ON public.estimates;
CREATE POLICY "estimates_delete" ON public.estimates FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- ─── Sales Orders ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  so_number             SERIAL,
  title                 TEXT NOT NULL DEFAULT '',
  estimate_id           UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  customer_id           UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','in_progress','completed','on_hold','void')),
  sales_rep_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  production_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_manager_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  designer_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  so_date               DATE,
  due_date              DATE,
  install_date          DATE,
  subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate              NUMERIC(5,4) NOT NULL DEFAULT 0,
  tax_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  down_payment_pct      NUMERIC(5,2) NOT NULL DEFAULT 50,
  payment_terms         TEXT,
  notes                 TEXT,
  invoiced              BOOLEAN NOT NULL DEFAULT false,
  form_data             JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_org      ON public.sales_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_estimate ON public.sales_orders(estimate_id);

CREATE OR REPLACE FUNCTION update_sales_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_sales_orders_updated_at();

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_orders_select" ON public.sales_orders;
CREATE POLICY "sales_orders_select" ON public.sales_orders FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "sales_orders_insert" ON public.sales_orders;
CREATE POLICY "sales_orders_insert" ON public.sales_orders FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "sales_orders_update" ON public.sales_orders;
CREATE POLICY "sales_orders_update" ON public.sales_orders FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "sales_orders_delete" ON public.sales_orders;
CREATE POLICY "sales_orders_delete" ON public.sales_orders FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  invoice_number  SERIAL,
  title           TEXT NOT NULL DEFAULT '',
  sales_order_id  UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','paid','overdue','void')),
  invoice_date    DATE,
  due_date        DATE,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,4) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due     NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  form_data       JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org         ON public.invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer    ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON public.invoices(sales_order_id);

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoices_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner','admin'))
);

-- ─── Line Items (shared: estimates, sales_orders, invoices) ───────────────────
CREATE TABLE IF NOT EXISTS public.line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type   TEXT NOT NULL CHECK (parent_type IN ('estimate','sales_order','invoice')),
  parent_id     UUID NOT NULL,
  product_type  TEXT NOT NULL DEFAULT 'wrap'
                CHECK (product_type IN ('wrap','decking','design','ppf')),
  name          TEXT NOT NULL DEFAULT '',
  description   TEXT,
  quantity      NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  specs         JSONB NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_items_parent ON public.line_items(parent_type, parent_id);

ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "line_items_select" ON public.line_items;
CREATE POLICY "line_items_select" ON public.line_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "line_items_insert" ON public.line_items;
CREATE POLICY "line_items_insert" ON public.line_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "line_items_update" ON public.line_items;
CREATE POLICY "line_items_update" ON public.line_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "line_items_delete" ON public.line_items;
CREATE POLICY "line_items_delete" ON public.line_items FOR DELETE USING (true);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  10. v6.1: Customer Connections, Onboarding Tokens, Communication Log   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Customer Connections (Network Map) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_a      UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_b      UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('referral','knows','fleet','works_with','family')),
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_connections_org ON public.customer_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_connections_a   ON public.customer_connections(customer_a);
CREATE INDEX IF NOT EXISTS idx_customer_connections_b   ON public.customer_connections(customer_b);

ALTER TABLE public.customer_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_connections_select" ON public.customer_connections;
CREATE POLICY "customer_connections_select" ON public.customer_connections FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "customer_connections_insert" ON public.customer_connections;
CREATE POLICY "customer_connections_insert" ON public.customer_connections FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "customer_connections_update" ON public.customer_connections;
CREATE POLICY "customer_connections_update" ON public.customer_connections FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "customer_connections_delete" ON public.customer_connections;
CREATE POLICY "customer_connections_delete" ON public.customer_connections FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Onboarding Tokens ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  customer_id  UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  estimate_id  UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','started','completed','expired')),
  form_data    JSONB NOT NULL DEFAULT '{}',
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_token ON public.onboarding_tokens(token);

ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_tokens_select" ON public.onboarding_tokens;
CREATE POLICY "onboarding_tokens_select" ON public.onboarding_tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "onboarding_tokens_update" ON public.onboarding_tokens;
CREATE POLICY "onboarding_tokens_update" ON public.onboarding_tokens FOR UPDATE USING (true);

DROP POLICY IF EXISTS "onboarding_tokens_insert" ON public.onboarding_tokens;
CREATE POLICY "onboarding_tokens_insert" ON public.onboarding_tokens FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Communication Log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('call','sms','email','note')),
  direction    TEXT CHECK (direction IN ('inbound','outbound')),
  subject      TEXT,
  body         TEXT,
  duration_sec INTEGER,
  logged_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_id  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_log_customer ON public.communication_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_org      ON public.communication_log(org_id);

ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communication_log_select" ON public.communication_log;
CREATE POLICY "communication_log_select" ON public.communication_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "communication_log_insert" ON public.communication_log;
CREATE POLICY "communication_log_insert" ON public.communication_log FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  11. v6.2: Comms, Contracts, Referral Codes, Payroll, Knowledge Base    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Customer Communications (Unified Inbox) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_communications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('sms','email','call','note')),
  direction     TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_name     TEXT,
  to_name       TEXT,
  subject       TEXT,
  body          TEXT,
  call_duration INTEGER,
  call_notes    TEXT,
  read          BOOLEAN DEFAULT false,
  agent_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comms_org_customer ON public.customer_communications(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_comms_created      ON public.customer_communications(created_at DESC);

ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_communications_all" ON public.customer_communications;
CREATE POLICY "customer_communications_all" ON public.customer_communications
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Contracts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  estimate_id UUID,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  version     INTEGER DEFAULT 1,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','expired')),
  sent_at     TIMESTAMPTZ,
  signed_at   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_org      ON public.contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON public.contracts(customer_id);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_all" ON public.contracts;
CREATE POLICY "contracts_all" ON public.contracts
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Signed Documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  contract_id    UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  signer_name    TEXT NOT NULL,
  signer_email   TEXT,
  signature_data TEXT,
  ip_address     TEXT,
  signed_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signed_documents_all" ON public.signed_documents;
CREATE POLICY "signed_documents_all" ON public.signed_documents
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Referral Codes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  code           TEXT NOT NULL UNIQUE,
  type           TEXT DEFAULT 'customer' CHECK (type IN ('customer','employee','partner')),
  owner_id       UUID,
  owner_name     TEXT,
  discount_pct   NUMERIC(5,2) DEFAULT 0,
  commission_pct NUMERIC(5,2) DEFAULT 2.5,
  active         BOOLEAN DEFAULT true,
  uses           INTEGER DEFAULT 0,
  max_uses       INTEGER,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_code ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes_all" ON public.referral_codes;
CREATE POLICY "referral_codes_all" ON public.referral_codes
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Referral Tracking ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referral_tracking (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  referral_code_id     UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  referred_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  referred_by_name     TEXT,
  status               TEXT DEFAULT 'pending' CHECK (status IN ('pending','converted','paid')),
  conversion_value     NUMERIC(12,2) DEFAULT 0,
  commission_paid      NUMERIC(12,2) DEFAULT 0,
  converted_at         TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_org ON public.referral_tracking(org_id);

ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_tracking_all" ON public.referral_tracking;
CREATE POLICY "referral_tracking_all" ON public.referral_tracking
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Payroll Periods ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  status           TEXT DEFAULT 'open' CHECK (status IN ('open','processing','closed')),
  total_payroll    NUMERIC(12,2) DEFAULT 0,
  total_commission NUMERIC(12,2) DEFAULT 0,
  total_bonus      NUMERIC(12,2) DEFAULT 0,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_org ON public.payroll_periods(org_id);

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_periods_all" ON public.payroll_periods;
CREATE POLICY "payroll_periods_all" ON public.payroll_periods
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Payroll Entries ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  period_id   UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hours       NUMERIC(6,2) DEFAULT 0,
  base_pay    NUMERIC(12,2) DEFAULT 0,
  commission  NUMERIC(12,2) DEFAULT 0,
  bonus       NUMERIC(12,2) DEFAULT 0,
  total_pay   NUMERIC(12,2) DEFAULT 0,
  breakdown   JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_period ON public.payroll_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_org    ON public.payroll_entries(org_id);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_entries_all" ON public.payroll_entries;
CREATE POLICY "payroll_entries_all" ON public.payroll_entries
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Wrap Knowledge Base ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wrap_knowledge_base (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  metadata   JSONB DEFAULT '{}',
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.wrap_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_org      ON public.wrap_knowledge_base(org_id);

ALTER TABLE public.wrap_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wrap_knowledge_base_all" ON public.wrap_knowledge_base;
CREATE POLICY "wrap_knowledge_base_all" ON public.wrap_knowledge_base
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ─── Tutorial Progress ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id       UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  step_key     TEXT NOT NULL,
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_tutorial_user ON public.tutorial_progress(user_id);

ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutorial_progress_all" ON public.tutorial_progress;
CREATE POLICY "tutorial_progress_all" ON public.tutorial_progress
  FOR ALL USING (user_id = auth.uid());

-- ─── Onboarding Sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  token           TEXT NOT NULL UNIQUE,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','expired')),
  steps_completed JSONB DEFAULT '[]',
  data            JSONB DEFAULT '{}',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_token ON public.onboarding_sessions(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_org   ON public.onboarding_sessions(org_id);

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "onboarding_sessions_all" ON public.onboarding_sessions;
CREATE POLICY "onboarding_sessions_all" ON public.onboarding_sessions
  FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  12. ADDITIONAL APP TABLES (Catalog, Inventory, Design, Settings, etc.) ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Team Invites ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('owner','admin','sales_agent','designer','production','installer','viewer')),
  invited_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','expired','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(email, org_id)
);

CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_org   ON public.team_invites(org_id, status);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_invites_select" ON public.team_invites;
CREATE POLICY "team_invites_select" ON public.team_invites FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM public.profiles
    WHERE org_id = team_invites.org_id AND role IN ('owner','admin')
  )
);

DROP POLICY IF EXISTS "team_invites_insert" ON public.team_invites;
CREATE POLICY "team_invites_insert" ON public.team_invites FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles
    WHERE org_id = team_invites.org_id AND role IN ('owner','admin')
  )
);

DROP POLICY IF EXISTS "team_invites_update" ON public.team_invites;
CREATE POLICY "team_invites_update" ON public.team_invites FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM public.profiles
    WHERE org_id = team_invites.org_id AND role IN ('owner','admin')
  )
);

-- ─── Job Expenses ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  category    TEXT NOT NULL DEFAULT 'misc',
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  billable    BOOLEAN NOT NULL DEFAULT true,
  receipt_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_expenses_project ON public.job_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_org     ON public.job_expenses(org_id);

DROP TRIGGER IF EXISTS job_expenses_updated_at ON public.job_expenses;
CREATE TRIGGER job_expenses_updated_at
  BEFORE UPDATE ON public.job_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_expenses_select" ON public.job_expenses;
CREATE POLICY "job_expenses_select" ON public.job_expenses FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_expenses_insert" ON public.job_expenses;
CREATE POLICY "job_expenses_insert" ON public.job_expenses FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "job_expenses_update" ON public.job_expenses;
CREATE POLICY "job_expenses_update" ON public.job_expenses FOR UPDATE USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND org_id = job_expenses.org_id AND role IN ('owner','admin')
  )
);

DROP POLICY IF EXISTS "job_expenses_delete" ON public.job_expenses;
CREATE POLICY "job_expenses_delete" ON public.job_expenses FOR DELETE USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND org_id = job_expenses.org_id AND role IN ('owner','admin')
  )
);

-- ─── Custom Vehicles (Catalog) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_vehicles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  year          TEXT,
  make          TEXT,
  model         TEXT,
  vehicle_type  TEXT NOT NULL DEFAULT 'car',
  total_sqft    NUMERIC,
  base_price    NUMERIC,
  default_hours NUMERIC,
  default_pay   NUMERIC,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_vehicles_org ON public.custom_vehicles(org_id);

ALTER TABLE public.custom_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_vehicles_select" ON public.custom_vehicles;
CREATE POLICY "custom_vehicles_select" ON public.custom_vehicles FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "custom_vehicles_insert" ON public.custom_vehicles;
CREATE POLICY "custom_vehicles_insert" ON public.custom_vehicles FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "custom_vehicles_update" ON public.custom_vehicles;
CREATE POLICY "custom_vehicles_update" ON public.custom_vehicles FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "custom_vehicles_delete" ON public.custom_vehicles;
CREATE POLICY "custom_vehicles_delete" ON public.custom_vehicles FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Custom Line Items (Catalog) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  description   TEXT,
  default_price NUMERIC,
  category      TEXT NOT NULL DEFAULT 'addon',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_line_items_org ON public.custom_line_items(org_id);

ALTER TABLE public.custom_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_line_items_select" ON public.custom_line_items;
CREATE POLICY "custom_line_items_select" ON public.custom_line_items FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "custom_line_items_insert" ON public.custom_line_items;
CREATE POLICY "custom_line_items_insert" ON public.custom_line_items FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "custom_line_items_update" ON public.custom_line_items;
CREATE POLICY "custom_line_items_update" ON public.custom_line_items FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "custom_line_items_delete" ON public.custom_line_items;
CREATE POLICY "custom_line_items_delete" ON public.custom_line_items FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Vinyl Inventory ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vinyl_inventory (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  brand          TEXT NOT NULL DEFAULT '',
  color          TEXT NOT NULL DEFAULT '',
  finish         TEXT DEFAULT 'Gloss',
  sku            TEXT DEFAULT '',
  width_inches   NUMERIC DEFAULT 60,
  length_ft      NUMERIC DEFAULT 150,
  sqft_available NUMERIC DEFAULT 0,
  cost_per_foot  NUMERIC DEFAULT 0,
  status         TEXT DEFAULT 'in_stock'
                 CHECK (status IN ('in_stock','low','out','on_order','consumed')),
  location       TEXT,
  notes          TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vinyl_inventory_org    ON public.vinyl_inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_inventory_status ON public.vinyl_inventory(status);
CREATE INDEX IF NOT EXISTS idx_vinyl_inventory_brand  ON public.vinyl_inventory(brand);

ALTER TABLE public.vinyl_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinyl_inventory_select" ON public.vinyl_inventory;
CREATE POLICY "vinyl_inventory_select" ON public.vinyl_inventory FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "vinyl_inventory_insert" ON public.vinyl_inventory;
CREATE POLICY "vinyl_inventory_insert" ON public.vinyl_inventory FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "vinyl_inventory_update" ON public.vinyl_inventory;
CREATE POLICY "vinyl_inventory_update" ON public.vinyl_inventory FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "vinyl_inventory_delete" ON public.vinyl_inventory;
CREATE POLICY "vinyl_inventory_delete" ON public.vinyl_inventory FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Vinyl Usage ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vinyl_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.vinyl_inventory(id) ON DELETE SET NULL,
  project_id   UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  sqft_used    NUMERIC NOT NULL DEFAULT 0,
  logged_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vinyl_usage_org       ON public.vinyl_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_usage_inventory ON public.vinyl_usage(inventory_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_usage_project   ON public.vinyl_usage(project_id);

ALTER TABLE public.vinyl_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinyl_usage_select" ON public.vinyl_usage;
CREATE POLICY "vinyl_usage_select" ON public.vinyl_usage FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "vinyl_usage_insert" ON public.vinyl_usage;
CREATE POLICY "vinyl_usage_insert" ON public.vinyl_usage FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Material Remnants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.material_remnants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  material_name  TEXT NOT NULL DEFAULT '',
  color          TEXT,
  finish         TEXT,
  width_inches   NUMERIC,
  length_inches  NUMERIC,
  sqft           NUMERIC,
  status         TEXT DEFAULT 'available'
                 CHECK (status IN ('available','reserved','consumed')),
  location       TEXT,
  notes          TEXT,
  source_roll_id UUID REFERENCES public.vinyl_inventory(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_remnants_org    ON public.material_remnants(org_id);
CREATE INDEX IF NOT EXISTS idx_material_remnants_status ON public.material_remnants(status);

ALTER TABLE public.material_remnants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_remnants_select" ON public.material_remnants;
CREATE POLICY "material_remnants_select" ON public.material_remnants FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "material_remnants_insert" ON public.material_remnants;
CREATE POLICY "material_remnants_insert" ON public.material_remnants FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "material_remnants_update" ON public.material_remnants;
CREATE POLICY "material_remnants_update" ON public.material_remnants FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Shop Settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_settings_select" ON public.shop_settings;
CREATE POLICY "shop_settings_select" ON public.shop_settings FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "shop_settings_insert" ON public.shop_settings;
CREATE POLICY "shop_settings_insert" ON public.shop_settings FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "shop_settings_update" ON public.shop_settings;
CREATE POLICY "shop_settings_update" ON public.shop_settings FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── App State (generic key-value) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_state (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, key)
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_state_select" ON public.app_state;
CREATE POLICY "app_state_select" ON public.app_state FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "app_state_all" ON public.app_state;
CREATE POLICY "app_state_all" ON public.app_state FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Design Projects ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_name       TEXT NOT NULL DEFAULT '',
  design_type       TEXT DEFAULT 'full_wrap',
  description       TEXT,
  designer_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline          DATE,
  stage             TEXT DEFAULT 'brief'
                    CHECK (stage IN ('brief','in_progress','proof_sent','approved')),
  linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_projects_org     ON public.design_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_project ON public.design_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_stage   ON public.design_projects(stage);

ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_projects_select" ON public.design_projects;
CREATE POLICY "design_projects_select" ON public.design_projects FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "design_projects_insert" ON public.design_projects;
CREATE POLICY "design_projects_insert" ON public.design_projects FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "design_projects_update" ON public.design_projects;
CREATE POLICY "design_projects_update" ON public.design_projects FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "design_projects_delete" ON public.design_projects;
CREATE POLICY "design_projects_delete" ON public.design_projects FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Design Project Comments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_project_comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  design_project_id UUID NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_project_comments_dp ON public.design_project_comments(design_project_id);

ALTER TABLE public.design_project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_project_comments_select" ON public.design_project_comments;
CREATE POLICY "design_project_comments_select" ON public.design_project_comments FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "design_project_comments_insert" ON public.design_project_comments;
CREATE POLICY "design_project_comments_insert" ON public.design_project_comments FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Design Project Files ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_project_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  design_project_id UUID NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  file_url          TEXT NOT NULL,
  file_name         TEXT,
  file_type         TEXT,
  uploaded_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_project_files_dp ON public.design_project_files(design_project_id);

ALTER TABLE public.design_project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_project_files_select" ON public.design_project_files;
CREATE POLICY "design_project_files_select" ON public.design_project_files FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "design_project_files_insert" ON public.design_project_files;
CREATE POLICY "design_project_files_insert" ON public.design_project_files FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "design_project_files_delete" ON public.design_project_files;
CREATE POLICY "design_project_files_delete" ON public.design_project_files FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Project Members (many-to-many: projects <-> profiles) ───────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_profile ON public.project_members(profile_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
CREATE POLICY "project_members_select" ON public.project_members FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
CREATE POLICY "project_members_delete" ON public.project_members FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── XP Ledger (gamification dedup tracking) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL DEFAULT 0,
  reason      TEXT NOT NULL,
  source_type TEXT,
  source_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user   ON public.xp_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_dedup  ON public.xp_ledger(user_id, reason, source_id);

ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_ledger_select" ON public.xp_ledger;
CREATE POLICY "xp_ledger_select" ON public.xp_ledger FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "xp_ledger_insert" ON public.xp_ledger;
CREATE POLICY "xp_ledger_insert" ON public.xp_ledger FOR INSERT WITH CHECK (true);

-- ─── Media Files (Media Library) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media_files (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  storage_path     TEXT NOT NULL,
  public_url       TEXT,
  filename         TEXT,
  mime_type        TEXT,
  file_size        INTEGER DEFAULT 0,
  uploaded_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source           TEXT DEFAULT 'internal',
  tags             JSONB DEFAULT '[]',
  ai_tags          JSONB DEFAULT '[]',
  vehicle_type_tag TEXT,
  wrap_type_tag    TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_files_org ON public.media_files(org_id);

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_files_select" ON public.media_files;
CREATE POLICY "media_files_select" ON public.media_files FOR SELECT USING (true);

DROP POLICY IF EXISTS "media_files_insert" ON public.media_files;
CREATE POLICY "media_files_insert" ON public.media_files FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "media_files_update" ON public.media_files;
CREATE POLICY "media_files_update" ON public.media_files FOR UPDATE USING (true);

DROP POLICY IF EXISTS "media_files_delete" ON public.media_files;
CREATE POLICY "media_files_delete" ON public.media_files FOR DELETE USING (true);

-- ─── Print Jobs (Production Print Schedule) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id                  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  scheduled_date              DATE,
  scheduled_start_time        TIME,
  estimated_print_minutes     INTEGER DEFAULT 0,
  estimated_dry_minutes       INTEGER DEFAULT 0,
  estimated_laminate_minutes  INTEGER DEFAULT 0,
  sqft_printed                NUMERIC DEFAULT 0,
  status                      TEXT DEFAULT 'queued'
                              CHECK (status IN ('queued','printing','drying','laminating','done','cancelled')),
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_org     ON public.print_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_project ON public.print_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_date    ON public.print_jobs(scheduled_date);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "print_jobs_select" ON public.print_jobs;
CREATE POLICY "print_jobs_select" ON public.print_jobs FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "print_jobs_insert" ON public.print_jobs;
CREATE POLICY "print_jobs_insert" ON public.print_jobs FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "print_jobs_update" ON public.print_jobs;
CREATE POLICY "print_jobs_update" ON public.print_jobs FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Printer Maintenance Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.printer_maintenance_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  printer_name           TEXT NOT NULL DEFAULT '',
  maintenance_type       TEXT DEFAULT 'scheduled',
  description            TEXT,
  performed_by           TEXT,
  print_hours_at_service NUMERIC DEFAULT 0,
  next_service_hours     NUMERIC DEFAULT 50,
  resolved               BOOLEAN DEFAULT true,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_printer_maint_org ON public.printer_maintenance_logs(org_id);

ALTER TABLE public.printer_maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "printer_maintenance_logs_select" ON public.printer_maintenance_logs;
CREATE POLICY "printer_maintenance_logs_select" ON public.printer_maintenance_logs FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "printer_maintenance_logs_insert" ON public.printer_maintenance_logs;
CREATE POLICY "printer_maintenance_logs_insert" ON public.printer_maintenance_logs FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Files (generic project file table from types) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bucket_path         TEXT NOT NULL,
  file_name           TEXT NOT NULL DEFAULT '',
  file_type           TEXT DEFAULT 'other'
                      CHECK (file_type IN ('photo','proof','pdf','export','reference','other')),
  mime_type           TEXT,
  size_bytes          INTEGER,
  version             INTEGER DEFAULT 1,
  parent_file_id      UUID REFERENCES public.files(id) ON DELETE SET NULL,
  is_current          BOOLEAN DEFAULT true,
  is_customer_visible BOOLEAN DEFAULT false,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_project ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_org     ON public.files(org_id);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "files_select" ON public.files;
CREATE POLICY "files_select" ON public.files FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "files_insert" ON public.files;
CREATE POLICY "files_insert" ON public.files FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "files_update" ON public.files;
CREATE POLICY "files_update" ON public.files FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "files_delete" ON public.files;
CREATE POLICY "files_delete" ON public.files FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  13. NEW v6.1 SHOPVOX TABLES                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── Job History (for AI auto-quoting from past jobs) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.job_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  vehicle_type  TEXT,
  vehicle_year  TEXT,
  vehicle_make  TEXT,
  vehicle_model TEXT,
  wrap_type     TEXT,
  material      TEXT,
  sqft          NUMERIC,
  sale_price    NUMERIC,
  cogs          NUMERIC,
  gpm           NUMERIC,
  install_hours NUMERIC,
  customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_history_org      ON public.job_history(org_id);
CREATE INDEX IF NOT EXISTS idx_job_history_vehicle  ON public.job_history(vehicle_make, vehicle_model);
CREATE INDEX IF NOT EXISTS idx_job_history_customer ON public.job_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_history_wrap     ON public.job_history(wrap_type);

ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_history_select" ON public.job_history;
CREATE POLICY "job_history_select" ON public.job_history FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_history_insert" ON public.job_history;
CREATE POLICY "job_history_insert" ON public.job_history FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_history_update" ON public.job_history;
CREATE POLICY "job_history_update" ON public.job_history FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "job_history_delete" ON public.job_history;
CREATE POLICY "job_history_delete" ON public.job_history FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Activity Log (GHL-style complete job journey) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  job_id      UUID,
  estimate_id UUID,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  actor_type  TEXT CHECK (actor_type IN ('user','customer','system','ai')),
  actor_id    UUID,
  actor_name  TEXT,
  action      TEXT NOT NULL,
  details     TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org       ON public.activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_job       ON public.activity_log(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_estimate  ON public.activity_log(estimate_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_customer  ON public.activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created   ON public.activity_log(created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "activity_log_insert" ON public.activity_log;
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Estimate Templates ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estimate_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  line_items  JSONB DEFAULT '[]',
  form_data   JSONB DEFAULT '{}',
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  use_count   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_templates_org      ON public.estimate_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_category ON public.estimate_templates(category);

ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimate_templates_select" ON public.estimate_templates;
CREATE POLICY "estimate_templates_select" ON public.estimate_templates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "estimate_templates_insert" ON public.estimate_templates;
CREATE POLICY "estimate_templates_insert" ON public.estimate_templates FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "estimate_templates_update" ON public.estimate_templates;
CREATE POLICY "estimate_templates_update" ON public.estimate_templates FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "estimate_templates_delete" ON public.estimate_templates;
CREATE POLICY "estimate_templates_delete" ON public.estimate_templates FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ─── Estimate Options (Proposal mode) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estimate_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  selected    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_options_estimate ON public.estimate_options(estimate_id);

ALTER TABLE public.estimate_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimate_options_select" ON public.estimate_options;
CREATE POLICY "estimate_options_select" ON public.estimate_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "estimate_options_insert" ON public.estimate_options;
CREATE POLICY "estimate_options_insert" ON public.estimate_options FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "estimate_options_update" ON public.estimate_options;
CREATE POLICY "estimate_options_update" ON public.estimate_options FOR UPDATE USING (true);

DROP POLICY IF EXISTS "estimate_options_delete" ON public.estimate_options;
CREATE POLICY "estimate_options_delete" ON public.estimate_options FOR DELETE USING (true);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  14. HANDLE NEW USER TRIGGER (auth signup -> auto-create profile)       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID := 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f';
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, org_id, email, name, avatar_url, role, active, permissions)
    VALUES (
      NEW.id,
      v_org_id,
      COALESCE(NEW.email, ''),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        split_part(COALESCE(NEW.email, 'user@'), '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
      ),
      'viewer',
      true,
      '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      email      = COALESCE(EXCLUDED.email, profiles.email),
      name       = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but do NOT re-raise — auth.users INSERT must succeed
    RAISE WARNING '[handle_new_user] profile insert failed for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  15. REALTIME PUBLICATIONS                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- These are safe to run multiple times; Supabase ignores duplicates in publication.
DO $$
BEGIN
  -- Try adding tables to realtime. If they already exist in the publication, skip.
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.send_backs; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.designer_bids; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.installer_bids; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.job_comments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.projects; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  16. STORAGE BUCKET                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Create the job-images bucket if it does not exist (Supabase storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 17: Prospects (Prospecting Center)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES orgs(id),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'warm' CHECK (status IN ('hot','warm','cold','dead','converted')),
  source TEXT DEFAULT 'other' CHECK (source IN ('cold_call','door_knock','referral','event','social_media','website','other')),
  assigned_to UUID REFERENCES profiles(id),
  fleet_size INTEGER,
  estimated_revenue NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  follow_up_date DATE,
  last_contact TIMESTAMPTZ,
  converted_customer_id UUID REFERENCES customers(id),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members manage prospects" ON prospects;
CREATE POLICY "Org members manage prospects" ON prospects
  FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_prospects_org ON prospects(org_id);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned ON prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

CREATE TRIGGER set_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DONE. All tables created. Migration is idempotent.                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- ============================================================
-- USA WRAP CO — v6.2 Schema Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Vehicle Database ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_database (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  year            TEXT NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  trim            TEXT,
  body_style      TEXT,
  sqft_full       NUMERIC,
  sqft_partial    NUMERIC,
  sqft_hood       NUMERIC,
  sqft_roof       NUMERIC,
  sqft_sides      NUMERIC,
  template_url    TEXT,
  template_scale  TEXT DEFAULT '1:20',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, year, make, model)
);

ALTER TABLE vehicle_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage vehicle database"
  ON vehicle_database FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_vehicle_db_org ON vehicle_database(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_db_search ON vehicle_database(org_id, year, make, model);


-- ── Time Entries (Employee Clock In/Out) ─────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  clock_in        TIMESTAMPTZ NOT NULL,
  clock_out       TIMESTAMPTZ,
  break_minutes   INTEGER DEFAULT 0,
  total_hours     NUMERIC,
  regular_hours   NUMERIC,
  overtime_hours  NUMERIC,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Employees can see their own entries; admins see all org entries
CREATE POLICY "Employees see own time entries"
  ON time_entries FOR SELECT
  USING (
    employee_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Employees manage own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees update own open entries"
  ON time_entries FOR UPDATE
  USING (
    employee_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_org ON time_entries(org_id, clock_in DESC);


-- ── PTO Requests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pto_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  hours           NUMERIC NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('sick','vacation','personal')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  approved_by     UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage own PTO requests"
  ON pto_requests FOR ALL
  USING (
    employee_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pto_employee ON pto_requests(employee_id);


-- ── Payroll Periods ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_periods (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','processing','closed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payroll periods"
  ON payroll_periods FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );


-- ── Payroll Entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_entries (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id           UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  regular_hours       NUMERIC DEFAULT 0,
  overtime_hours      NUMERIC DEFAULT 0,
  base_pay            NUMERIC DEFAULT 0,
  commission_earned   NUMERIC DEFAULT 0,
  bonus               NUMERIC DEFAULT 0,
  total_pay           NUMERIC DEFAULT 0,
  breakdown_json      JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payroll entries"
  ON payroll_entries FOR ALL
  USING (
    period_id IN (
      SELECT id FROM payroll_periods
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Employees can view their own payroll entries
CREATE POLICY "Employees view own payroll"
  ON payroll_entries FOR SELECT
  USING (employee_id = auth.uid());


-- ============================================================
-- v6.3 Additional Tables (Phase 1–4 features)
-- ============================================================

-- ── Affiliates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliates (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id              UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  company             TEXT,
  email               TEXT,
  phone               TEXT,
  type                TEXT NOT NULL DEFAULT 'dealer'
                      CHECK (type IN ('dealer','manufacturer','reseller','individual')),
  commission_structure JSONB DEFAULT '{"type":"percent_gp","rate":10}',
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('pending','active','inactive')),
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step     INTEGER DEFAULT 0,
  direct_deposit_info JSONB DEFAULT '{}',
  unique_code         TEXT UNIQUE,
  unique_link         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage affiliates"
  ON affiliates FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_affiliates_org ON affiliates(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(unique_code);

-- ── Affiliate Commissions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id    UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount          NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage affiliate commissions"
  ON affiliate_commissions FOR ALL
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );
CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_project ON affiliate_commissions(project_id);

-- ── Purchase Orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  vendor      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','ordered','received','cancelled')),
  line_items  JSONB DEFAULT '[]',
  total       NUMERIC DEFAULT 0,
  notes       TEXT,
  ordered_at  TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage purchase orders"
  ON purchase_orders FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_po_org ON purchase_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_po_project ON purchase_orders(project_id);

-- ── AI Recaps ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_recaps (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  recap_data   JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view ai recaps"
  ON ai_recaps FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ── Message Templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'custom'
              CHECK (category IN ('onboarding','follow_up','status_update','custom')),
  content     TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage templates"
  ON message_templates FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_templates_org ON message_templates(org_id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  MISSING TABLES — v6.4 additions                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Integrations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  api_key     TEXT,
  config      JSONB DEFAULT '{}',
  enabled     BOOLEAN DEFAULT false,
  status      TEXT DEFAULT 'disconnected'
              CHECK (status IN ('connected','disconnected','error')),
  last_sync   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "integrations_select" ON public.integrations;
CREATE POLICY "integrations_select" ON public.integrations FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "integrations_manage" ON public.integrations;
CREATE POLICY "integrations_manage" ON public.integrations FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON public.integrations(org_id);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  method        TEXT DEFAULT 'other'
                CHECK (method IN ('cash','check','credit_card','ach','wire','other')),
  status        TEXT DEFAULT 'completed'
                CHECK (status IN ('pending','completed','refunded','failed')),
  reference     TEXT,
  notes         TEXT,
  paid_at       TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "payments_manage" ON public.payments;
CREATE POLICY "payments_manage" ON public.payments FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin','sales_agent'))
);
CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- ── Time Blocks (calendar scheduling) ────────────────────────
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT '',
  block_type  TEXT DEFAULT 'install'
              CHECK (block_type IN ('install','production','design','meeting','pto','other')),
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  all_day     BOOLEAN DEFAULT false,
  notes       TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "time_blocks_select" ON public.time_blocks;
CREATE POLICY "time_blocks_select" ON public.time_blocks FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "time_blocks_manage" ON public.time_blocks;
CREATE POLICY "time_blocks_manage" ON public.time_blocks FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_time_blocks_org ON public.time_blocks(org_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user ON public.time_blocks(user_id);

-- ── Card Templates ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.card_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'general',
  layout      JSONB DEFAULT '{}',
  thumbnail   TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "card_templates_select" ON public.card_templates;
CREATE POLICY "card_templates_select" ON public.card_templates FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "card_templates_manage" ON public.card_templates;
CREATE POLICY "card_templates_manage" ON public.card_templates FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_card_templates_org ON public.card_templates(org_id);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'info'
              CHECK (type IN ('info','warning','error','success','task','stage_change','send_back','bid','comment')),
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT,
  link        TEXT,
  read        BOOLEAN DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (
  user_id = auth.uid()
);
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- ── Verify ───────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'v6.4 schema migration complete.';
  RAISE NOTICE 'Added: integrations, payments, time_blocks, card_templates, notifications';
END
$$;
