-- ── Missing tables: installer_messages, installer_earnings, installer_schedule,
--    loyalty_redemptions, materials, proof_reviews, configurator_sessions ──────

-- 1. installer_messages
CREATE TABLE IF NOT EXISTS public.installer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'team' CHECK (channel IN ('team', 'dm')),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_installer_messages_org ON public.installer_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_installer_messages_sender ON public.installer_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_installer_messages_channel ON public.installer_messages(org_id, channel);
ALTER TABLE public.installer_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installer_messages_select" ON public.installer_messages FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "installer_messages_insert" ON public.installer_messages FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "installer_messages_delete" ON public.installer_messages FOR DELETE USING (org_id = get_my_org_id());

-- 2. installer_earnings
CREATE TABLE IF NOT EXISTS public.installer_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  assignment_id uuid,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  type text DEFAULT 'job_pay',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'voided')),
  pay_period_start date,
  pay_period_end date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_installer_earnings_org ON public.installer_earnings(org_id);
CREATE INDEX IF NOT EXISTS idx_installer_earnings_installer ON public.installer_earnings(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_earnings_project ON public.installer_earnings(project_id);
ALTER TABLE public.installer_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installer_earnings_select" ON public.installer_earnings FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "installer_earnings_insert" ON public.installer_earnings FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "installer_earnings_update" ON public.installer_earnings FOR UPDATE USING (org_id = get_my_org_id());
CREATE POLICY "installer_earnings_delete" ON public.installer_earnings FOR DELETE USING (org_id = get_my_org_id());

-- 3. installer_schedule
CREATE TABLE IF NOT EXISTS public.installer_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  assignment_id uuid,
  scheduled_date date NOT NULL,
  start_time time,
  end_time time,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_installer_schedule_org ON public.installer_schedule(org_id);
CREATE INDEX IF NOT EXISTS idx_installer_schedule_installer ON public.installer_schedule(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_schedule_date ON public.installer_schedule(org_id, scheduled_date);
ALTER TABLE public.installer_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installer_schedule_select" ON public.installer_schedule FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "installer_schedule_insert" ON public.installer_schedule FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "installer_schedule_update" ON public.installer_schedule FOR UPDATE USING (org_id = get_my_org_id());
CREATE POLICY "installer_schedule_delete" ON public.installer_schedule FOR DELETE USING (org_id = get_my_org_id());

-- 4. loyalty_redemptions
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  points_redeemed integer NOT NULL DEFAULT 0,
  dollar_value numeric(8,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'rejected')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_org ON public.loyalty_redemptions(org_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer ON public.loyalty_redemptions(customer_id);
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
-- Public portal: customer can insert/select their own redemptions
CREATE POLICY "loyalty_redemptions_select" ON public.loyalty_redemptions FOR SELECT USING (true);
CREATE POLICY "loyalty_redemptions_insert" ON public.loyalty_redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY "loyalty_redemptions_update" ON public.loyalty_redemptions FOR UPDATE USING (org_id = get_my_org_id());

-- 5. materials (vinyl/PPF/decking catalog)
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'wrap',
  cost_per_sqft numeric(8,4) DEFAULT 0,
  supplier text,
  sku text,
  description text,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  specs jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_materials_org ON public.materials(org_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(org_id, category);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_select" ON public.materials FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "materials_insert" ON public.materials FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "materials_update" ON public.materials FOR UPDATE USING (org_id = get_my_org_id());
CREATE POLICY "materials_delete" ON public.materials FOR DELETE USING (org_id = get_my_org_id());

-- 6. proof_reviews
CREATE TABLE IF NOT EXISTS public.proof_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_file_id uuid REFERENCES public.design_files(id) ON DELETE CASCADE,
  reviewer_type text DEFAULT 'customer' CHECK (reviewer_type IN ('customer', 'internal')),
  action text NOT NULL CHECK (action IN ('approved', 'changes_requested', 'comment', 'rejected')),
  annotations jsonb DEFAULT '[]',
  comment text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proof_reviews_design_file ON public.proof_reviews(design_file_id);
ALTER TABLE public.proof_reviews ENABLE ROW LEVEL SECURITY;
-- Public proof portal inserts without auth — intentionally permissive
CREATE POLICY "proof_reviews_select" ON public.proof_reviews FOR SELECT USING (true);
CREATE POLICY "proof_reviews_insert" ON public.proof_reviews FOR INSERT WITH CHECK (true);

-- 7. configurator_sessions
CREATE TABLE IF NOT EXISTS public.configurator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  vehicle_category text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  panel_config jsonb DEFAULT '{}',
  screenshot_url text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_configurator_sessions_org ON public.configurator_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_configurator_sessions_created_by ON public.configurator_sessions(created_by);
ALTER TABLE public.configurator_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configurator_sessions_select" ON public.configurator_sessions FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "configurator_sessions_insert" ON public.configurator_sessions FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "configurator_sessions_update" ON public.configurator_sessions FOR UPDATE USING (org_id = get_my_org_id());
