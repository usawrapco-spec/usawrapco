-- Design Intake Sessions table
CREATE TABLE IF NOT EXISTS design_intake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  org_id uuid NOT NULL DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  contact_name text,
  contact_email text,
  contact_phone text,
  business_name text,
  website_url text,
  how_heard text,
  services_selected jsonb DEFAULT '[]'::jsonb,
  vehicle_data jsonb DEFAULT '{}'::jsonb,
  brand_data jsonb DEFAULT '{}'::jsonb,
  inspiration_images jsonb DEFAULT '[]'::jsonb,
  style_preference text,
  ai_chat_history jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add design_intake_token to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_intake_token text UNIQUE;

-- RLS
ALTER TABLE design_intake_sessions ENABLE ROW LEVEL SECURITY;

-- Public can read/update their own session by token
CREATE POLICY "Public read by token" ON design_intake_sessions
  FOR SELECT USING (true);

CREATE POLICY "Public insert" ON design_intake_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update by token" ON design_intake_sessions
  FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_intake_sessions_token ON design_intake_sessions(token);
CREATE INDEX IF NOT EXISTS idx_design_intake_sessions_org ON design_intake_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_design_intake_sessions_project ON design_intake_sessions(project_id);
