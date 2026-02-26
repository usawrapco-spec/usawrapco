-- Maintenance/support tickets from customers
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id),
  customer_id uuid REFERENCES customers(id),
  original_project_id uuid REFERENCES projects(id),
  ticket_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ticket_type text NOT NULL DEFAULT 'issue_report',
  -- 'warranty_claim' | 'issue_report' | 'maintenance_request' | 'damage_assessment' | 'refresh_inquiry' | 'general_question'
  status text DEFAULT 'open',
  -- 'open' | 'reviewing' | 'scheduled' | 'in_progress' | 'resolved' | 'declined'
  priority text DEFAULT 'normal',
  -- 'low' | 'normal' | 'high' | 'urgent'
  subject text NOT NULL,
  description text,
  photos jsonb DEFAULT '[]'::jsonb,
  ai_assessment text,
  ai_severity text,
  ai_recommended_action text,
  internal_notes text,
  assigned_to uuid REFERENCES profiles(id),
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  affected_areas text[],
  install_date date,
  warranty_expiry date,
  is_warranty_eligible boolean DEFAULT false,
  estimated_repair_cost numeric,
  resolution_notes text,
  resolved_at timestamptz,
  customer_rating int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reorder requests (existing customers booking new service)
CREATE TABLE IF NOT EXISTS reorder_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  org_id uuid REFERENCES orgs(id),
  request_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  services_requested jsonb DEFAULT '[]'::jsonb,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  is_same_vehicle boolean DEFAULT false,
  is_new_vehicle boolean DEFAULT false,
  urgency text DEFAULT 'flexible',
  budget_range text,
  notes text,
  photos jsonb DEFAULT '[]'::jsonb,
  ai_quote_estimate numeric,
  ai_quote_reasoning text,
  converted_to_project_id uuid REFERENCES projects(id),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Customer vehicle profiles (saved vehicles for fast reorder)
CREATE TABLE IF NOT EXISTS customer_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  year text,
  make text,
  model text,
  trim text,
  color text,
  license_plate text,
  vin text,
  vehicle_type text DEFAULT 'car',
  -- 'car' | 'truck' | 'van' | 'suv' | 'boat' | 'trailer'
  boat_length_ft numeric,
  boat_make text,
  boat_model text,
  is_primary boolean DEFAULT false,
  nickname text,
  photo_url text,
  services_done jsonb DEFAULT '[]'::jsonb,
  wrap_info jsonb,
  ppf_info jsonb,
  decking_info jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer portal notifications
CREATE TABLE IF NOT EXISTS customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  type text NOT NULL,
  -- 'ticket_update' | 'job_status' | 'maintenance_reminder' | 'promotion' | 'referral_earned' | 'new_service_available'
  title text NOT NULL,
  message text,
  action_url text,
  action_label text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add warranty + install tracking columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS warranty_years int DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS warranty_expiry date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS install_completed_date date;

-- Enable RLS
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

-- Staff/org full access
CREATE POLICY "org_full_access_tickets" ON maintenance_tickets
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

CREATE POLICY "org_full_access_reorder" ON reorder_requests
  FOR ALL USING (org_id = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid);

CREATE POLICY "org_full_access_vehicles" ON customer_vehicles
  FOR ALL USING (true);

CREATE POLICY "org_full_access_notifications" ON customer_notifications
  FOR ALL USING (true);

-- Public token access for maintenance tickets (customers submit via token)
CREATE POLICY "public_ticket_token_access" ON maintenance_tickets
  FOR ALL USING (ticket_token IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_customer ON maintenance_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_project ON maintenance_tickets(original_project_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status ON maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_reorder_requests_customer ON reorder_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer ON customer_vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON customer_notifications(customer_id, is_read);
