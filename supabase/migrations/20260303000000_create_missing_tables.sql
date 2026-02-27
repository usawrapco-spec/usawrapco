-- Create all tables that were referenced in code but missing from DB

-- ── communication_log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES customers(id) ON DELETE SET NULL,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  type          text NOT NULL DEFAULT 'note',
  direction     text DEFAULT 'outbound',
  subject       text,
  body          text,
  content       text,
  sent_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  author_name   text,
  status        text DEFAULT 'logged',
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON communication_log
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── time_blocks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  title       text,
  block_type  text DEFAULT 'other',
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON time_blocks
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── customer_connections ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid REFERENCES orgs(id) ON DELETE CASCADE,
  from_customer_id  uuid REFERENCES customers(id) ON DELETE CASCADE,
  to_customer_id    uuid REFERENCES customers(id) ON DELETE CASCADE,
  connection_type   text DEFAULT 'referral',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON customer_connections
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── proofing_tokens ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proofing_tokens (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid REFERENCES orgs(id) ON DELETE CASCADE,
  token              text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  design_project_id  uuid REFERENCES design_projects(id) ON DELETE SET NULL,
  project_id         uuid REFERENCES projects(id) ON DELETE SET NULL,
  customer_id        uuid REFERENCES customers(id) ON DELETE SET NULL,
  status             text DEFAULT 'pending',
  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE proofing_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_token_read" ON proofing_tokens FOR SELECT USING (true);
CREATE POLICY "org_write" ON proofing_tokens FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── wrap_materials ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_materials (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid REFERENCES orgs(id) ON DELETE CASCADE,
  name           text NOT NULL,
  brand          text,
  sku            text,
  category       text DEFAULT 'vinyl',
  color          text,
  finish         text,
  width_in       numeric,
  price_per_sqft numeric,
  cost_per_sqft  numeric,
  stock_yards    numeric DEFAULT 0,
  min_stock      numeric DEFAULT 10,
  enabled        boolean DEFAULT true,
  sort_order     integer DEFAULT 0,
  image_url      text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wrap_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON wrap_materials
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR org_id IS NULL);

-- ── campaign_messages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id  uuid,
  prospect_id  uuid,
  step_number  integer DEFAULT 1,
  subject      text,
  body         text,
  status       text DEFAULT 'pending',
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON campaign_messages
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── design_files ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES orgs(id) ON DELETE CASCADE,
  job_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  name        text,
  canvas_json jsonb,
  version     integer DEFAULT 1,
  mode        text DEFAULT 'design',
  status      text DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON design_files
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── emails ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid REFERENCES orgs(id) ON DELETE CASCADE,
  email_account_id    uuid REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_message_id    text,
  gmail_thread_id     text,
  message_id_header   text,
  direction           text DEFAULT 'inbound',
  from_email          text,
  from_name           text,
  to_email            text,
  to_name             text,
  subject             text,
  body_html           text,
  body_text           text,
  snippet             text,
  is_read             boolean DEFAULT false,
  is_starred          boolean DEFAULT false,
  labels              text[],
  conversation_id     uuid REFERENCES conversations(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON emails
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── print_jobs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS print_jobs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      uuid REFERENCES orgs(id) ON DELETE CASCADE,
  project_id                  uuid REFERENCES projects(id) ON DELETE SET NULL,
  scheduled_date              date,
  scheduled_start_time        time,
  estimated_print_minutes     integer DEFAULT 0,
  estimated_dry_minutes       integer DEFAULT 0,
  estimated_laminate_minutes  integer DEFAULT 0,
  sqft_printed                numeric DEFAULT 0,
  status                      text DEFAULT 'queued',
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON print_jobs
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── purchase_orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES orgs(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  vendor      text,
  status      text DEFAULT 'draft',
  line_items  jsonb DEFAULT '[]'::jsonb,
  total       numeric DEFAULT 0,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON purchase_orders
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── shop_reports ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES orgs(id) ON DELETE CASCADE,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type        text DEFAULT 'general',
  title       text NOT NULL,
  content     text,
  status      text DEFAULT 'open',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shop_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON shop_reports
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── vehicle_checkins ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES orgs(id) ON DELETE CASCADE,
  job_id          uuid REFERENCES projects(id) ON DELETE SET NULL,
  vin             text,
  year            text,
  make            text,
  model           text,
  color           text,
  odometer        integer,
  license_plate   text,
  vehicle_type    text,
  checked_in_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  checked_in_at   timestamptz DEFAULT now(),
  damage_markers  jsonb DEFAULT '[]'::jsonb,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vehicle_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON vehicle_checkins
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── prospect_interactions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospect_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid REFERENCES orgs(id) ON DELETE CASCADE,
  prospect_id      uuid REFERENCES prospects(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  interaction_type text DEFAULT 'call',
  outcome          text,
  notes            text,
  next_action      text,
  next_action_date date,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE prospect_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON prospect_interactions
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── printer_maintenance_logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS printer_maintenance_logs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid REFERENCES orgs(id) ON DELETE CASCADE,
  printer_name           text NOT NULL,
  maintenance_type       text,
  description            text,
  performed_by           text,
  print_hours_at_service numeric DEFAULT 0,
  next_service_hours     numeric DEFAULT 50,
  resolved               boolean DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE printer_maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON printer_maintenance_logs
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── referral_codes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid REFERENCES orgs(id) ON DELETE CASCADE,
  code           text UNIQUE NOT NULL,
  type           text DEFAULT 'customer',
  owner_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  owner_name     text,
  commission_pct numeric DEFAULT 0,
  active         boolean DEFAULT true,
  total_uses     integer DEFAULT 0,
  total_earned   numeric DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON referral_codes
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── customer_communications ──────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_communications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  direction    text DEFAULT 'outbound',
  channel      text DEFAULT 'email',
  subject      text,
  body         text,
  agent_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON customer_communications
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── design_canvas_versions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_canvas_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid REFERENCES orgs(id) ON DELETE CASCADE,
  design_project_id uuid REFERENCES design_projects(id) ON DELETE CASCADE,
  name              text,
  canvas_data       jsonb,
  thumbnail_url     text,
  created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE design_canvas_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON design_canvas_versions
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── design_presentations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_presentations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid REFERENCES orgs(id) ON DELETE CASCADE,
  design_project_id uuid REFERENCES design_projects(id) ON DELETE SET NULL,
  token             text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  title             text,
  client_name       text,
  slides            jsonb DEFAULT '[]'::jsonb,
  timer_seconds     integer,
  password          text,
  branding          jsonb,
  expires_at        timestamptz,
  created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE design_presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON design_presentations FOR SELECT USING (true);
CREATE POLICY "org_write" ON design_presentations FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── signed_documents ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signed_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,
  customer_id   uuid REFERENCES customers(id) ON DELETE SET NULL,
  document_type text DEFAULT 'contract',
  signed_at     timestamptz,
  signer_name   text,
  signer_email  text,
  file_url      text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON signed_documents
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── payment_schedules ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES orgs(id) ON DELETE CASCADE,
  sales_order_id  uuid REFERENCES sales_orders(id) ON DELETE CASCADE,
  template        text DEFAULT 'custom',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON payment_schedules
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── payment_milestones ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_milestones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id      uuid REFERENCES payment_schedules(id) ON DELETE CASCADE,
  name             text NOT NULL,
  amount_type      text DEFAULT 'percentage',
  amount_value     numeric DEFAULT 0,
  resolved_amount  numeric DEFAULT 0,
  due_trigger      text DEFAULT 'net_30',
  status           text DEFAULT 'pending',
  invoice_id       uuid REFERENCES invoices(id) ON DELETE SET NULL,
  paid_at          timestamptz,
  sort_order       integer DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "via_schedule" ON payment_milestones
  USING (schedule_id IN (
    SELECT id FROM payment_schedules
    WHERE org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- ── render_settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS render_settings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES orgs(id) ON DELETE CASCADE,
  job_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  settings     jsonb DEFAULT '{}'::jsonb,
  updated_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE render_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON render_settings
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
