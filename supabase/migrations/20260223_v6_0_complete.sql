-- ============================================================================
-- WRAPSHOP PRO v6.0 — COMPLETE DATABASE MIGRATION
-- USA Wrap Co — All Tables for 17 Sections
-- Generated: 2026-02-23
-- Org ID: d34a6c47-1ac0-4008-87d2-0f7741eebc4f
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: DESIGN STUDIO TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Design Projects (main design tracking)
CREATE TABLE IF NOT EXISTS public.design_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  linked_project_id uuid,
  title text NOT NULL,
  status text DEFAULT 'brief' CHECK (status IN ('brief','in_progress','proof_sent','approved','complete')),
  designer_id uuid,
  notes text,
  vehicle_type text,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  canvas_data jsonb DEFAULT '{}',
  brand_files jsonb DEFAULT '[]',
  portal_token text DEFAULT gen_random_uuid()::text,
  print_width_inches decimal DEFAULT 54,
  bleed_inches decimal DEFAULT 0.125,
  resolution_dpi int DEFAULT 300,
  client_name text,
  design_type text DEFAULT 'Full Wrap',
  description text,
  deadline timestamptz,
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_projects_org ON public.design_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_status ON public.design_projects(status);
CREATE INDEX IF NOT EXISTS idx_design_projects_designer ON public.design_projects(designer_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_linked ON public.design_projects(linked_project_id);

ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_projects_all" ON public.design_projects;
CREATE POLICY "design_projects_all" ON public.design_projects FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Design Files (mockups, proofs, PDFs, print-ready files)
CREATE TABLE IF NOT EXISTS public.design_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES public.design_projects(id) ON DELETE CASCADE,
  project_id uuid,
  org_id uuid NOT NULL,
  filename text,
  storage_path text,
  file_type text CHECK (file_type IN ('photo','proof','pdf','mockup','logo','brand','print_ready')),
  version int DEFAULT 1,
  parent_file_id uuid,
  is_customer_visible boolean DEFAULT false,
  is_print_ready boolean DEFAULT false,
  width_px int,
  height_px int,
  file_size_bytes bigint,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_files_project ON public.design_files(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_files_type ON public.design_files(file_type);

ALTER TABLE public.design_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_files_all" ON public.design_files;
CREATE POLICY "design_files_all" ON public.design_files FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Design Annotations (markup on proofs)
CREATE TABLE IF NOT EXISTS public.design_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES public.design_files(id) ON DELETE CASCADE,
  design_project_id uuid,
  org_id uuid NOT NULL,
  created_by uuid,
  annotation_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.design_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_annotations_all" ON public.design_annotations;
CREATE POLICY "design_annotations_all" ON public.design_annotations FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Design Comments (file-specific discussions)
CREATE TABLE IF NOT EXISTS public.design_project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES public.design_projects(id) ON DELETE CASCADE,
  file_id uuid,
  org_id uuid NOT NULL,
  author_id uuid,
  message text,
  is_internal boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_comments_project ON public.design_project_comments(design_project_id);

ALTER TABLE public.design_project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_comments_all" ON public.design_project_comments;
CREATE POLICY "design_comments_all" ON public.design_project_comments FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Design Approvals (proof approval tracking)
CREATE TABLE IF NOT EXISTS public.design_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES public.design_projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  type text DEFAULT 'proof',
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','revision_requested')),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.design_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_approvals_all" ON public.design_approvals;
CREATE POLICY "design_approvals_all" ON public.design_approvals FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Design Project Files (alternate table name compatibility)
CREATE TABLE IF NOT EXISTS public.design_project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid REFERENCES public.design_projects(id) ON DELETE CASCADE,
  file_name text,
  file_url text,
  file_type text,
  file_size bigint,
  version int DEFAULT 1,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.design_project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "design_project_files_all" ON public.design_project_files;
CREATE POLICY "design_project_files_all" ON public.design_project_files FOR ALL USING (
  design_project_id IN (
    SELECT id FROM public.design_projects WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11: INSTALLER MODULE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Installer Bids
CREATE TABLE IF NOT EXISTS public.installer_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid,
  installer_id uuid,
  offered_rate decimal,
  target_rate decimal DEFAULT 35,
  estimated_hours decimal,
  bid_amount decimal,
  available_date date,
  deadline timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  decline_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installer_bids_project ON public.installer_bids(project_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_installer ON public.installer_bids(installer_id);
CREATE INDEX IF NOT EXISTS idx_installer_bids_status ON public.installer_bids(status);

ALTER TABLE public.installer_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installer_bids_all" ON public.installer_bids;
CREATE POLICY "installer_bids_all" ON public.installer_bids FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  OR installer_id = auth.uid()
);

-- Installer Time Blocks (time tracking)
CREATE TABLE IF NOT EXISTS public.installer_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  installer_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_project ON public.installer_time_blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_installer ON public.installer_time_blocks(installer_id);

ALTER TABLE public.installer_time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_blocks_all" ON public.installer_time_blocks;
CREATE POLICY "time_blocks_all" ON public.installer_time_blocks FOR ALL USING (
  installer_id = auth.uid()
  OR project_id IN (
    SELECT id FROM public.projects WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Installer Groups (for bulk bid sending)
CREATE TABLE IF NOT EXISTS public.installer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.installer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF NOT EXISTS "installer_groups_all" ON public.installer_groups;
CREATE POLICY "installer_groups_all" ON public.installer_groups FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Installer Group Members (many-to-many)
CREATE TABLE IF NOT EXISTS public.installer_group_members (
  group_id uuid REFERENCES public.installer_groups(id) ON DELETE CASCADE,
  installer_id uuid,
  PRIMARY KEY (group_id, installer_id)
);

ALTER TABLE public.installer_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_members_all" ON public.installer_group_members;
CREATE POLICY "group_members_all" ON public.installer_group_members FOR ALL USING (
  group_id IN (
    SELECT id FROM public.installer_groups WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  OR installer_id = auth.uid()
);

-- Installer Bid Recipients (who was sent a bid)
CREATE TABLE IF NOT EXISTS public.installer_bid_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid,
  installer_id uuid,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.installer_bid_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bid_recipients_all" ON public.installer_bid_recipients;
CREATE POLICY "bid_recipients_all" ON public.installer_bid_recipients FOR ALL USING (
  installer_id = auth.uid()
  OR bid_id IN (
    SELECT id FROM public.installer_bids WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Installer Bid Responses
CREATE TABLE IF NOT EXISTS public.installer_bid_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid,
  installer_id uuid,
  status text CHECK (status IN ('accepted','declined')),
  bid_amount decimal,
  available_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.installer_bid_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bid_responses_all" ON public.installer_bid_responses;
CREATE POLICY "bid_responses_all" ON public.installer_bid_responses FOR ALL USING (
  installer_id = auth.uid()
  OR bid_id IN (
    SELECT id FROM public.installer_bids WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 14: CUSTOMER LOYALTY & REFERRALS
-- ═══════════════════════════════════════════════════════════════════════════

-- Sales Referrals (cross-team commission tracking)
CREATE TABLE IF NOT EXISTS public.sales_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid,
  referring_user_id uuid,
  closing_user_id uuid,
  split_pct decimal DEFAULT 0.025,
  amount_earned decimal,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_referrals_project ON public.sales_referrals(project_id);
CREATE INDEX IF NOT EXISTS idx_sales_referrals_referring ON public.sales_referrals(referring_user_id);

ALTER TABLE public.sales_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_referrals_all" ON public.sales_referrals;
CREATE POLICY "sales_referrals_all" ON public.sales_referrals FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Referral Codes (customer referral tracking)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  customer_id uuid,
  code text UNIQUE NOT NULL,
  discount_pct decimal DEFAULT 10,
  uses_count int DEFAULT 0,
  max_uses int,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_customer ON public.referral_codes(customer_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes_select" ON public.referral_codes;
CREATE POLICY "referral_codes_select" ON public.referral_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "referral_codes_modify" ON public.referral_codes;
CREATE POLICY "referral_codes_modify" ON public.referral_codes FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Referral Tracking (who referred whom)
CREATE TABLE IF NOT EXISTS public.referral_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  referral_code text,
  referred_customer_id uuid,
  project_id uuid,
  reward_amount decimal,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_tracking_all" ON public.referral_tracking;
CREATE POLICY "referral_tracking_all" ON public.referral_tracking FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 17: V.I.N.Y.L. AI ASSISTANT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Conversations (unified inbox: SMS, email, portal messages)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  customer_id uuid,
  channel text CHECK (channel IN ('sms','email','web_chat','portal')),
  phone_number text,
  email_address text,
  status text DEFAULT 'active' CHECK (status IN ('active','escalated','closed','converted')),
  escalation_reason text,
  escalated_to uuid,
  ai_enabled boolean DEFAULT true,
  lead_stage text DEFAULT 'new' CHECK (lead_stage IN ('new','qualifying','quoting','negotiating','deposit_sent','converted','lost')),
  vehicle_info jsonb DEFAULT '{}',
  wrap_preferences jsonb DEFAULT '{}',
  quote_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_all" ON public.conversations;
CREATE POLICY "conversations_all" ON public.conversations FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Messages (conversation history)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text CHECK (role IN ('customer','ai','human_agent')),
  content text NOT NULL,
  channel text CHECK (channel IN ('sms','email','web_chat','portal')),
  ai_reasoning text,
  ai_confidence decimal,
  tokens_used int,
  cost_cents int,
  external_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_all" ON public.messages;
CREATE POLICY "messages_all" ON public.messages FOR ALL USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE org_id IN (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Escalation Rules (when to route to human)
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  rule_type text CHECK (rule_type IN ('keyword','sentiment','dollar_threshold','explicit_request','confidence')),
  rule_config jsonb DEFAULT '{}',
  notify_channel text CHECK (notify_channel IN ('slack','sms','email')),
  notify_target text,
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escalation_rules_all" ON public.escalation_rules;
CREATE POLICY "escalation_rules_all" ON public.escalation_rules FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Sales Playbook (AI response guidance)
CREATE TABLE IF NOT EXISTS public.sales_playbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  category text CHECK (category IN ('greeting','qualification','pricing','objection','upsell','closing','followup','faq','policy','competitor','brand_voice')),
  trigger_phrase text,
  response_guidance text NOT NULL,
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_category ON public.sales_playbook(category);

ALTER TABLE public.sales_playbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "playbook_all" ON public.sales_playbook;
CREATE POLICY "playbook_all" ON public.sales_playbook FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Pricing Rules (AI auto-quoting logic)
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  vehicle_category text,
  wrap_type text,
  base_price decimal NOT NULL DEFAULT 0,
  price_per_sqft decimal,
  max_discount_pct decimal DEFAULT 0,
  rush_multiplier jsonb DEFAULT '{}',
  complexity_multiplier jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_vehicle ON public.pricing_rules(vehicle_category);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rules_all" ON public.pricing_rules;
CREATE POLICY "pricing_rules_all" ON public.pricing_rules FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12: PRODUCTION MODULE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Vinyl Inventory (material rolls tracking)
CREATE TABLE IF NOT EXISTS public.vinyl_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  material_name text NOT NULL,
  material_type text,
  color text,
  supplier text,
  sku text,
  rolls_count int DEFAULT 0,
  sqft_per_roll decimal DEFAULT 0,
  total_sqft decimal GENERATED ALWAYS AS (rolls_count * sqft_per_roll) STORED,
  cost_per_sqft decimal,
  reorder_threshold int DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vinyl_inventory_org ON public.vinyl_inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_inventory_material ON public.vinyl_inventory(material_name);

ALTER TABLE public.vinyl_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinyl_inventory_all" ON public.vinyl_inventory;
CREATE POLICY "vinyl_inventory_all" ON public.vinyl_inventory FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Vinyl Usage (per-job material consumption)
CREATE TABLE IF NOT EXISTS public.vinyl_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid,
  material_id uuid REFERENCES public.vinyl_inventory(id) ON DELETE SET NULL,
  material_name text,
  sqft_quoted decimal,
  sqft_used decimal,
  linear_feet decimal,
  rolls_used decimal,
  waste_pct decimal GENERATED ALWAYS AS (
    CASE WHEN sqft_quoted > 0
    THEN ((sqft_used - sqft_quoted) / sqft_quoted * 100)
    ELSE 0 END
  ) STORED,
  notes text,
  logged_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vinyl_usage_project ON public.vinyl_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_vinyl_usage_material ON public.vinyl_usage(material_id);

ALTER TABLE public.vinyl_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinyl_usage_all" ON public.vinyl_usage;
CREATE POLICY "vinyl_usage_all" ON public.vinyl_usage FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Sourcing Orders (subcontractor print orders)
CREATE TABLE IF NOT EXISTS public.sourcing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid,
  vendor_name text,
  order_type text CHECK (order_type IN ('print','cut','install','material')),
  sent_date date,
  expected_date date,
  actual_return_date date,
  cost decimal,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sent','in_progress','completed','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sourcing_orders_project ON public.sourcing_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_status ON public.sourcing_orders(status);

ALTER TABLE public.sourcing_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sourcing_orders_all" ON public.sourcing_orders;
CREATE POLICY "sourcing_orders_all" ON public.sourcing_orders FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ADD TRIGGERS FOR updated_at TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_updated_at_design_projects ON public.design_projects;
CREATE TRIGGER set_updated_at_design_projects
  BEFORE UPDATE ON public.design_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_installer_bids ON public.installer_bids;
CREATE TRIGGER set_updated_at_installer_bids
  BEFORE UPDATE ON public.installer_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_conversations ON public.conversations;
CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_vinyl_inventory ON public.vinyl_inventory;
CREATE TRIGGER set_updated_at_vinyl_inventory
  BEFORE UPDATE ON public.vinyl_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════
