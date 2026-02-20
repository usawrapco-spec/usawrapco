-- ============================================================
-- USA WRAP CO — SPRINT 2B MEGA MIGRATION
-- Customer Portal, Proofing, Designer Bids, Installer Bids,
-- Referrals, Visibility Controls
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. CUSTOMER INTAKE TOKENS — shareable links for customer onboarding
CREATE TABLE IF NOT EXISTS public.customer_intake (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  -- Collected data
  vehicle_photos JSONB DEFAULT '[]',    -- [{url, side: 'front'|'rear'|'left'|'right'|'top', uploaded_at}]
  logo_files JSONB DEFAULT '[]',        -- [{url, file_name, uploaded_at}]
  brand_colors TEXT,
  brand_fonts TEXT,
  design_brief TEXT,
  text_content TEXT,
  references_notes TEXT,
  removal_required BOOLEAN DEFAULT false,
  removal_description TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_token ON public.customer_intake(token);
CREATE INDEX IF NOT EXISTS idx_intake_project ON public.customer_intake(project_id);

ALTER TABLE public.customer_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view by token" ON public.customer_intake FOR SELECT USING (true);
CREATE POLICY "Public can update by token" ON public.customer_intake FOR UPDATE USING (true);
CREATE POLICY "Org members can insert" ON public.customer_intake FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 2. DESIGN PROOFS — tracks each proof version sent to customer
CREATE TABLE IF NOT EXISTS public.design_proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  designer_notes TEXT,
  -- Customer response
  customer_status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'revision_requested'
  customer_feedback TEXT,
  customer_approved_at TIMESTAMPTZ,
  customer_name_confirm TEXT,              -- typed name = signature
  responsibility_accepted BOOLEAN DEFAULT false,  -- "I accept responsibility for layout, spelling, grammar"
  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proofs_project ON public.design_proofs(project_id);

ALTER TABLE public.design_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view proofs" ON public.design_proofs FOR SELECT USING (true);
CREATE POLICY "Public can update proofs" ON public.design_proofs FOR UPDATE USING (true);
CREATE POLICY "Org members can insert proofs" ON public.design_proofs FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 3. PROOF SETTINGS — edit limits per job
CREATE TABLE IF NOT EXISTS public.proof_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  max_revisions INTEGER DEFAULT 3,
  revisions_used INTEGER DEFAULT 0,
  proofing_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_settings_project ON public.proof_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_proof_settings_token ON public.proof_settings(proofing_token);

ALTER TABLE public.proof_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view by token" ON public.proof_settings FOR SELECT USING (true);
CREATE POLICY "Public can update by token" ON public.proof_settings FOR UPDATE USING (true);
CREATE POLICY "Org members can insert" ON public.proof_settings FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 4. DESIGNER BIDS — bidding system for design work
CREATE TABLE IF NOT EXISTS public.designer_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'declined', 'counter', 'assigned'
  is_first_choice BOOLEAN DEFAULT false,
  -- Package info (snapshot)
  package_data JSONB DEFAULT '{}',         -- design notes, brand info, vehicle, scope, deadline
  -- Designer response
  counter_terms TEXT,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,                    -- "art done by" date
  bid_expires_at TIMESTAMPTZ,             -- deadline to accept
  -- Completion
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_designer_bids_project ON public.designer_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_designer_bids_designer ON public.designer_bids(designer_id);

ALTER TABLE public.designer_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org view" ON public.designer_bids FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org insert" ON public.designer_bids FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org update" ON public.designer_bids FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.designer_bids;


-- 5. DESIGNER SPECIALTIES — tagging system
CREATE TABLE IF NOT EXISTS public.designer_specialties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  designer_id UUID NOT NULL REFERENCES auth.users(id),
  specialty TEXT NOT NULL,  -- 'vehicles', 'boats', 'fleet', 'complex_curves', 'lettering', 'color_change', 'ppf'
  UNIQUE(designer_id, specialty)
);

ALTER TABLE public.designer_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org view" ON public.designer_specialties FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org manage" ON public.designer_specialties FOR ALL
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 6. INSTALLER BIDS — job bidding for installers
CREATE TABLE IF NOT EXISTS public.installer_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installer_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'declined'
  pay_amount NUMERIC,
  hours_budget NUMERIC,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  liability_accepted BOOLEAN DEFAULT false,  -- accept material responsibility
  bid_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installer_bids_project ON public.installer_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_installer ON public.installer_bids(installer_id);

ALTER TABLE public.installer_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org view" ON public.installer_bids FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org insert" ON public.installer_bids FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org update" ON public.installer_bids FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.installer_bids;


-- 7. REFERRALS — cross-sell tracking between agents/divisions
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  referring_agent_id UUID NOT NULL REFERENCES auth.users(id),
  receiving_agent_id UUID NOT NULL REFERENCES auth.users(id),
  referral_type TEXT NOT NULL DEFAULT 'percentage',  -- 'percentage' or 'flat'
  referral_rate NUMERIC,          -- e.g. 2.5 for 2.5%
  flat_amount NUMERIC,            -- e.g. 100 for $100 flat
  from_division TEXT,             -- 'wrap' or 'decking'
  to_division TEXT,
  commission_earned NUMERIC,      -- calculated when job closes
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_project ON public.referrals(project_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referring ON public.referrals(referring_agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_receiving ON public.referrals(receiving_agent_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org view" ON public.referrals FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org insert" ON public.referrals FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org update" ON public.referrals FOR UPDATE
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));


-- 8. VISIBILITY SETTINGS — per-org pipeline visibility controls
CREATE TABLE IF NOT EXISTS public.visibility_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE,
  -- Hierarchy: sales > production > install
  sales_sees_production BOOLEAN DEFAULT true,
  sales_sees_install BOOLEAN DEFAULT true,
  production_sees_install BOOLEAN DEFAULT true,
  install_sees_production BOOLEAN DEFAULT false,
  -- Assignment-only mode
  assigned_only_sales BOOLEAN DEFAULT false,     -- sales only see their assigned jobs
  assigned_only_install BOOLEAN DEFAULT true,     -- installers only see their assigned jobs
  assigned_only_production BOOLEAN DEFAULT false,
  -- Division controls
  divisions_enabled BOOLEAN DEFAULT true,         -- enable wrap vs decking separation
  division_list JSONB DEFAULT '["wrap","decking"]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org view" ON public.visibility_settings FOR SELECT
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Org manage" ON public.visibility_settings FOR ALL
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Insert default settings
INSERT INTO public.visibility_settings (org_id)
SELECT DISTINCT org_id FROM public.profiles
ON CONFLICT (org_id) DO NOTHING;


-- 9. Add division column to projects if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'division') THEN
    ALTER TABLE public.projects ADD COLUMN division TEXT DEFAULT 'wrap';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'referral_agent_id') THEN
    ALTER TABLE public.projects ADD COLUMN referral_agent_id UUID;
  END IF;
END $$;


-- 10. Add specialties and max_bids to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_active_bids') THEN
    ALTER TABLE public.profiles ADD COLUMN max_active_bids INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'division') THEN
    ALTER TABLE public.profiles ADD COLUMN division TEXT DEFAULT 'wrap';
  END IF;
END $$;
