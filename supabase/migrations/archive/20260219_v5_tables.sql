-- v5.0 Migration: Create all missing tables and add columns
-- =====================================================

-- design_projects (may already exist, use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS design_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  designer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  design_type TEXT NOT NULL DEFAULT 'Full Wrap',
  description TEXT,
  stage TEXT NOT NULL DEFAULT 'brief' CHECK (stage IN ('brief','in_progress','proof_sent','approved')),
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- shop_settings
CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE,
  vehicle_pay_defaults JSONB DEFAULT '{}',
  trailer_defaults JSONB DEFAULT '{}',
  box_truck_defaults JSONB DEFAULT '{}',
  ppf_defaults JSONB DEFAULT '{}',
  overhead_costs JSONB DEFAULT '{}',
  bonus_pool_enabled BOOLEAN DEFAULT false,
  default_ppf_labor_pct DECIMAL(5,2) DEFAULT 12,
  min_conversion_rate DECIMAL(5,2) DEFAULT 20,
  conversion_tracking_enabled BOOLEAN DEFAULT true,
  target_gpm DECIMAL(5,2) DEFAULT 75,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- custom_vehicles
CREATE TABLE IF NOT EXISTS custom_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  year TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'car',
  total_sqft DECIMAL(8,2),
  base_price DECIMAL(10,2),
  default_hours DECIMAL(5,1),
  default_pay DECIMAL(10,2),
  sub_options JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- custom_line_items
CREATE TABLE IF NOT EXISTS custom_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2) DEFAULT 0,
  category TEXT DEFAULT 'addon',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- customer_intake_tokens
CREATE TABLE IF NOT EXISTS customer_intake_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- proofing_tokens
CREATE TABLE IF NOT EXISTS proofing_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','revision_requested')),
  feedback TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- project_members
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- design_project_comments
CREATE TABLE IF NOT EXISTS design_project_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_project_id UUID REFERENCES design_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'message',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- design_project_files
CREATE TABLE IF NOT EXISTS design_project_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_project_id UUID REFERENCES design_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Add columns to projects table if they don't exist
-- =====================================================
DO $$
BEGIN
  -- Text fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='business_name') THEN ALTER TABLE projects ADD COLUMN business_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='vehicle_color') THEN ALTER TABLE projects ADD COLUMN vehicle_color TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='lead_type') THEN ALTER TABLE projects ADD COLUMN lead_type TEXT DEFAULT 'inbound'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='torq_completed') THEN ALTER TABLE projects ADD COLUMN torq_completed BOOLEAN DEFAULT false; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='job_type') THEN ALTER TABLE projects ADD COLUMN job_type TEXT DEFAULT 'commercial'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='job_subtype') THEN ALTER TABLE projects ADD COLUMN job_subtype TEXT DEFAULT 'vehicle'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='vehicle_size') THEN ALTER TABLE projects ADD COLUMN vehicle_size TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='wrap_coverage') THEN ALTER TABLE projects ADD COLUMN wrap_coverage TEXT DEFAULT 'full'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='roof_addon') THEN ALTER TABLE projects ADD COLUMN roof_addon TEXT DEFAULT 'none'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='perf_window_film') THEN ALTER TABLE projects ADD COLUMN perf_window_film BOOLEAN DEFAULT false; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='material_type') THEN ALTER TABLE projects ADD COLUMN material_type TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='material_order_link') THEN ALTER TABLE projects ADD COLUMN material_order_link TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='total_sqft') THEN ALTER TABLE projects ADD COLUMN total_sqft DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='labor_pct') THEN ALTER TABLE projects ADD COLUMN labor_pct DECIMAL(5,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='design_fee') THEN ALTER TABLE projects ADD COLUMN design_fee DECIMAL(10,2) DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='misc_costs') THEN ALTER TABLE projects ADD COLUMN misc_costs DECIMAL(10,2) DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='prep_work') THEN ALTER TABLE projects ADD COLUMN prep_work JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='manual_pay_override') THEN ALTER TABLE projects ADD COLUMN manual_pay_override DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='parts_to_wrap') THEN ALTER TABLE projects ADD COLUMN parts_to_wrap TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='parts_not_to_wrap') THEN ALTER TABLE projects ADD COLUMN parts_not_to_wrap TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='scope_of_work') THEN ALTER TABLE projects ADD COLUMN scope_of_work TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='design_instructions') THEN ALTER TABLE projects ADD COLUMN design_instructions TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='brand_colors') THEN ALTER TABLE projects ADD COLUMN brand_colors TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='design_status') THEN ALTER TABLE projects ADD COLUMN design_status TEXT DEFAULT 'not_started'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_installer_hours') THEN ALTER TABLE projects ADD COLUMN actual_installer_hours DECIMAL(5,1); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_installer_pay') THEN ALTER TABLE projects ADD COLUMN actual_installer_pay DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_material_cost') THEN ALTER TABLE projects ADD COLUMN actual_material_cost DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_design_fees') THEN ALTER TABLE projects ADD COLUMN actual_design_fees DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_sale_price') THEN ALTER TABLE projects ADD COLUMN actual_sale_price DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_sqft_used') THEN ALTER TABLE projects ADD COLUMN actual_sqft_used DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='actual_linft_printed') THEN ALTER TABLE projects ADD COLUMN actual_linft_printed DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='reprint_cost') THEN ALTER TABLE projects ADD COLUMN reprint_cost DECIMAL(10,2) DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='qc_status') THEN ALTER TABLE projects ADD COLUMN qc_status TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='qc_notes') THEN ALTER TABLE projects ADD COLUMN qc_notes TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='close_notes') THEN ALTER TABLE projects ADD COLUMN close_notes TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='commission_amount') THEN ALTER TABLE projects ADD COLUMN commission_amount DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='production_bonus') THEN ALTER TABLE projects ADD COLUMN production_bonus DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='installer_signature') THEN ALTER TABLE projects ADD COLUMN installer_signature TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='pipe_stage') THEN ALTER TABLE projects ADD COLUMN pipe_stage TEXT DEFAULT 'sales_in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='stage_checklist') THEN ALTER TABLE projects ADD COLUMN stage_checklist JSONB DEFAULT '{}'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='referral_source') THEN ALTER TABLE projects ADD COLUMN referral_source TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='production_person') THEN ALTER TABLE projects ADD COLUMN production_person TEXT DEFAULT 'Josh'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='target_install_date') THEN ALTER TABLE projects ADD COLUMN target_install_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='bid_deadline') THEN ALTER TABLE projects ADD COLUMN bid_deadline DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='trailer_width') THEN ALTER TABLE projects ADD COLUMN trailer_width DECIMAL(5,1); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='trailer_height') THEN ALTER TABLE projects ADD COLUMN trailer_height DECIMAL(5,1); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='trailer_labor_pct') THEN ALTER TABLE projects ADD COLUMN trailer_labor_pct DECIMAL(5,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='marine_hull_length') THEN ALTER TABLE projects ADD COLUMN marine_hull_length DECIMAL(5,1); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='marine_passes') THEN ALTER TABLE projects ADD COLUMN marine_passes INTEGER; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='marine_transom') THEN ALTER TABLE projects ADD COLUMN marine_transom BOOLEAN DEFAULT false; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='marine_hull_height') THEN ALTER TABLE projects ADD COLUMN marine_hull_height DECIMAL(5,1); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='ppf_package') THEN ALTER TABLE projects ADD COLUMN ppf_package TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='ppf_labor_pct') THEN ALTER TABLE projects ADD COLUMN ppf_labor_pct DECIMAL(5,2) DEFAULT 12; END IF;
END $$;

-- =====================================================
-- RLS policies for all new tables
-- =====================================================
ALTER TABLE design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_intake_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofing_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_project_files ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- design_projects policies
DROP POLICY IF EXISTS "design_projects_select" ON design_projects;
CREATE POLICY "design_projects_select" ON design_projects FOR SELECT USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "design_projects_insert" ON design_projects;
CREATE POLICY "design_projects_insert" ON design_projects FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "design_projects_update" ON design_projects;
CREATE POLICY "design_projects_update" ON design_projects FOR UPDATE USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "design_projects_delete" ON design_projects;
CREATE POLICY "design_projects_delete" ON design_projects FOR DELETE USING (org_id = get_user_org_id());

-- shop_settings policies
DROP POLICY IF EXISTS "shop_settings_select" ON shop_settings;
CREATE POLICY "shop_settings_select" ON shop_settings FOR SELECT USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "shop_settings_insert" ON shop_settings;
CREATE POLICY "shop_settings_insert" ON shop_settings FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "shop_settings_update" ON shop_settings;
CREATE POLICY "shop_settings_update" ON shop_settings FOR UPDATE USING (org_id = get_user_org_id());

-- custom_vehicles policies
DROP POLICY IF EXISTS "custom_vehicles_select" ON custom_vehicles;
CREATE POLICY "custom_vehicles_select" ON custom_vehicles FOR SELECT USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "custom_vehicles_insert" ON custom_vehicles;
CREATE POLICY "custom_vehicles_insert" ON custom_vehicles FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "custom_vehicles_update" ON custom_vehicles;
CREATE POLICY "custom_vehicles_update" ON custom_vehicles FOR UPDATE USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "custom_vehicles_delete" ON custom_vehicles;
CREATE POLICY "custom_vehicles_delete" ON custom_vehicles FOR DELETE USING (org_id = get_user_org_id());

-- custom_line_items policies
DROP POLICY IF EXISTS "custom_line_items_select" ON custom_line_items;
CREATE POLICY "custom_line_items_select" ON custom_line_items FOR SELECT USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "custom_line_items_insert" ON custom_line_items;
CREATE POLICY "custom_line_items_insert" ON custom_line_items FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "custom_line_items_update" ON custom_line_items;
CREATE POLICY "custom_line_items_update" ON custom_line_items FOR UPDATE USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "custom_line_items_delete" ON custom_line_items;
CREATE POLICY "custom_line_items_delete" ON custom_line_items FOR DELETE USING (org_id = get_user_org_id());

-- customer_intake_tokens policies
DROP POLICY IF EXISTS "customer_intake_tokens_select" ON customer_intake_tokens;
CREATE POLICY "customer_intake_tokens_select" ON customer_intake_tokens FOR SELECT USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "customer_intake_tokens_insert" ON customer_intake_tokens;
CREATE POLICY "customer_intake_tokens_insert" ON customer_intake_tokens FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "customer_intake_tokens_update" ON customer_intake_tokens;
CREATE POLICY "customer_intake_tokens_update" ON customer_intake_tokens FOR UPDATE USING (org_id = get_user_org_id());

-- proofing_tokens policies
DROP POLICY IF EXISTS "proofing_tokens_select" ON proofing_tokens;
CREATE POLICY "proofing_tokens_select" ON proofing_tokens FOR SELECT USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "proofing_tokens_insert" ON proofing_tokens;
CREATE POLICY "proofing_tokens_insert" ON proofing_tokens FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "proofing_tokens_update" ON proofing_tokens;
CREATE POLICY "proofing_tokens_update" ON proofing_tokens FOR UPDATE USING (org_id = get_user_org_id());

-- project_members policies
DROP POLICY IF EXISTS "project_members_select" ON project_members;
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.org_id = get_user_org_id())
);
DROP POLICY IF EXISTS "project_members_insert" ON project_members;
CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.org_id = get_user_org_id())
);
DROP POLICY IF EXISTS "project_members_delete" ON project_members;
CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.org_id = get_user_org_id())
);

-- design_project_comments policies
DROP POLICY IF EXISTS "design_project_comments_select" ON design_project_comments;
CREATE POLICY "design_project_comments_select" ON design_project_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM design_projects dp WHERE dp.id = design_project_comments.design_project_id AND dp.org_id = get_user_org_id())
);
DROP POLICY IF EXISTS "design_project_comments_insert" ON design_project_comments;
CREATE POLICY "design_project_comments_insert" ON design_project_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM design_projects dp WHERE dp.id = design_project_comments.design_project_id AND dp.org_id = get_user_org_id())
);

-- design_project_files policies
DROP POLICY IF EXISTS "design_project_files_select" ON design_project_files;
CREATE POLICY "design_project_files_select" ON design_project_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM design_projects dp WHERE dp.id = design_project_files.design_project_id AND dp.org_id = get_user_org_id())
);
DROP POLICY IF EXISTS "design_project_files_insert" ON design_project_files;
CREATE POLICY "design_project_files_insert" ON design_project_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM design_projects dp WHERE dp.id = design_project_files.design_project_id AND dp.org_id = get_user_org_id())
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_design_projects_org ON design_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_project ON design_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_designer ON design_projects(designer_id);
CREATE INDEX IF NOT EXISTS idx_shop_settings_org ON shop_settings(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_vehicles_org ON custom_vehicles(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_line_items_org ON custom_line_items(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_intake_tokens_org ON customer_intake_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_intake_tokens_project ON customer_intake_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_intake_tokens_token ON customer_intake_tokens(token);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_org ON proofing_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_project ON proofing_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_proofing_tokens_token ON proofing_tokens(token);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_design_project_comments_dp ON design_project_comments(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_project_files_dp ON design_project_files(design_project_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_org ON installer_bids(org_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_project ON installer_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_installer ON installer_bids(installer_id);

-- =====================================================
-- Enable realtime on key tables
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE design_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE installer_bids;
