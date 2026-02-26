-- Communications system tables + mockup/proof fixes
-- Already applied via MCP; this file tracks it for GitHub Actions

CREATE TABLE IF NOT EXISTS conversation_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid UNIQUE NOT NULL,
  ai_enabled boolean DEFAULT true,
  ai_persona text DEFAULT 'friendly',
  ai_goal text DEFAULT 'just_respond',
  ai_context text,
  max_turns int DEFAULT 5,
  turns_used int DEFAULT 0,
  paused_by uuid,
  paused_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_ai_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_ai_config" ON conversation_ai_config FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS ai_comm_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  trigger_type text NOT NULL,
  enabled boolean DEFAULT true,
  ai_enabled boolean DEFAULT true,
  ai_persona text DEFAULT 'friendly',
  ai_goal text DEFAULT 'just_respond',
  ai_context text,
  max_ai_turns int DEFAULT 5,
  escalate_on_keywords text[] DEFAULT ARRAY['angry','refund','cancel','lawsuit','manager','attorney'],
  name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ai_comm_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_ai_rules" ON ai_comm_rules FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS ai_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  conversation_id uuid,
  rule_id uuid,
  trigger_type text,
  model_used text,
  prompt_tokens int,
  completion_tokens int,
  response_text text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ai_message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_ai_log" ON ai_message_log FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  from_email text,
  from_name text,
  to_email text,
  subject text,
  body_text text,
  body_html text,
  raw_payload jsonb,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_inbound_emails" ON inbound_emails FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  name text NOT NULL,
  channel text NOT NULL,
  message_body text,
  subject text,
  target_filter jsonb DEFAULT '{}'::jsonb,
  recipient_count int DEFAULT 0,
  sent_count int DEFAULT 0,
  reply_count int DEFAULT 0,
  status text DEFAULT 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_campaigns" ON broadcast_campaigns FOR ALL USING (true);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_channel text;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_name text;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS proof_token text;
UPDATE projects SET proof_token = encode(gen_random_bytes(12), 'hex') WHERE proof_token IS NULL;

ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS is_selected_for_proof boolean DEFAULT false;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS sent_to_customer boolean DEFAULT false;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE design_mockups ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE design_proofs ADD COLUMN IF NOT EXISTS mockup_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE design_proofs ADD COLUMN IF NOT EXISTS proof_token text;
ALTER TABLE design_proofs ADD COLUMN IF NOT EXISTS customer_note text;
ALTER TABLE design_proofs ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS trigger_type text;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS channel text DEFAULT 'sms';
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS channel text DEFAULT 'sms';
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS delay_minutes int DEFAULT 0;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS step_number int DEFAULT 1;

ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS sequence_step_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid,
  step_id uuid,
  scheduled_for timestamptz,
  sent_at timestamptz,
  status text DEFAULT 'scheduled',
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sequence_step_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "all_access_step_sends" ON sequence_step_sends FOR ALL USING (true);
