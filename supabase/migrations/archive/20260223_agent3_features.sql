-- Agent 3: New Features Migration
-- V.I.N.Y.L., AI Command Center, Design Studio, Proofing, Workflows, Communications

-- AI Settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Design Files table
CREATE TABLE IF NOT EXISTS design_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID,
  name TEXT,
  canvas_json JSONB,
  thumbnail_url TEXT,
  export_url TEXT,
  version INT DEFAULT 1,
  mode TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  proof_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  revision_count INT DEFAULT 0,
  included_revisions INT DEFAULT 2,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proof Reviews table
CREATE TABLE IF NOT EXISTS proof_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_file_id UUID REFERENCES design_files(id),
  reviewer_type TEXT,
  action TEXT,
  annotations JSONB DEFAULT '[]',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  name TEXT,
  trigger_type TEXT,
  is_active BOOLEAN DEFAULT true,
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  channel TEXT CHECK (channel IN ('sms','email','vinyl_chat','internal','portal')),
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  customer_id UUID,
  job_id UUID,
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent',
  twilio_message_sid TEXT,
  read_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write ai_settings
CREATE POLICY "ai_settings_all" ON ai_settings FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to manage design_files
CREATE POLICY "design_files_all" ON design_files FOR ALL USING (true) WITH CHECK (true);

-- Allow anyone to read/write proof_reviews (customer portal access)
CREATE POLICY "proof_reviews_all" ON proof_reviews FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to manage workflows
CREATE POLICY "workflows_all" ON workflows FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to manage communications
CREATE POLICY "communications_all" ON communications FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_settings_key ON ai_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_design_files_job ON design_files(job_id);
CREATE INDEX IF NOT EXISTS idx_design_files_token ON design_files(proof_token);
CREATE INDEX IF NOT EXISTS idx_proof_reviews_design ON proof_reviews(design_file_id);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_communications_customer ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(channel);
CREATE INDEX IF NOT EXISTS idx_communications_created ON communications(created_at DESC);
