-- ============================================================
-- USA WRAP CO — PHASE 2 SPRINT 1 MIGRATION
-- Approval Pipeline, Install Tracking, Material Tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. STAGE APPROVALS — tracks sign-off per stage per job
CREATE TABLE IF NOT EXISTS public.stage_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,                    -- 'sales_in', 'production', 'install', 'prod_review', 'sales_close'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'sent_back'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  checklist JSONB DEFAULT '{}',           -- stage-specific checklist items and their completion
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_stage_approvals_project ON public.stage_approvals(project_id, stage);

ALTER TABLE public.stage_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals in their org"
  ON public.stage_approvals FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert approvals in their org"
  ON public.stage_approvals FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update approvals in their org"
  ON public.stage_approvals FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 2. SEND-BACKS — when a stage is rejected
CREATE TABLE IF NOT EXISTS public.send_backs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL,               -- stage that rejected
  to_stage TEXT NOT NULL,                 -- stage sent back to
  reason TEXT NOT NULL,                   -- 'vinyl_issue', 'wrong_dims', 'color_mismatch', 'install_quality', 'missing_info', 'client_change', 'other'
  reason_detail TEXT,                     -- freeform detail
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_send_backs_project ON public.send_backs(project_id);

ALTER TABLE public.send_backs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view send_backs in their org"
  ON public.send_backs FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert send_backs in their org"
  ON public.send_backs FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update send_backs in their org"
  ON public.send_backs FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.send_backs;


-- 3. INSTALL SESSIONS — timer tracking for installers
CREATE TABLE IF NOT EXISTS public.install_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,              -- computed on stop
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_install_sessions_project ON public.install_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_install_sessions_installer ON public.install_sessions(installer_id);

ALTER TABLE public.install_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view install sessions in their org"
  ON public.install_sessions FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert install sessions in their org"
  ON public.install_sessions FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update install sessions in their org"
  ON public.install_sessions FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 4. MATERIAL TRACKING — actual material usage per job
CREATE TABLE IF NOT EXISTS public.material_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quoted_sqft NUMERIC,
  actual_sqft NUMERIC,
  linear_ft_printed NUMERIC,
  print_width_inches NUMERIC DEFAULT 54,  -- standard roll width
  buffer_pct NUMERIC,                     -- calculated buffer percentage
  material_type TEXT,                     -- 'Avery MPI 1105', '3M 2080', etc.
  actual_material_cost NUMERIC,
  actual_installer_pay NUMERIC,
  actual_design_fee NUMERIC,
  actual_hours NUMERIC,
  actual_sale_price NUMERIC,
  notes TEXT,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_material_tracking_project ON public.material_tracking(project_id);

ALTER TABLE public.material_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view material tracking in their org"
  ON public.material_tracking FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert material tracking in their org"
  ON public.material_tracking FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update material tracking in their org"
  ON public.material_tracking FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 5. Add actuals columns to projects if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'actual_hours') THEN
    ALTER TABLE public.projects ADD COLUMN actual_hours NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'actual_cost') THEN
    ALTER TABLE public.projects ADD COLUMN actual_cost NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'installer_signature') THEN
    ALTER TABLE public.projects ADD COLUMN installer_signature TEXT;
  END IF;
END $$;
