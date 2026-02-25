-- ── Phone System & SMS Templates ─────────────────────────────────────
-- Tables: phone_system, phone_departments, phone_agents, call_logs, sms_templates
-- Applied directly via Supabase execute_sql; this file tracks the schema for git.

-- ── phone_system ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_system (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id              uuid NOT NULL,
  twilio_phone_number text,
  greeting_text       text DEFAULT 'Thank you for calling. Please hold while we connect you.',
  voicemail_enabled   boolean DEFAULT true,
  recording_enabled   boolean DEFAULT true,
  transcription_enabled boolean DEFAULT true,
  auto_sms_on_miss    boolean DEFAULT true,
  hold_music_url      text DEFAULT 'https://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3',
  business_hours_start time DEFAULT '09:00',
  business_hours_end  time DEFAULT '17:00',
  business_days       text[] DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  after_hours_action  text DEFAULT 'voicemail',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS phone_system_org_id_idx ON phone_system(org_id);

ALTER TABLE phone_system ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='phone_system' AND policyname='org_access') THEN
    CREATE POLICY org_access ON phone_system
      USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Seed default row for the org
INSERT INTO phone_system (org_id) VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f')
ON CONFLICT (org_id) DO NOTHING;

-- ── phone_departments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_departments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL,
  name        text NOT NULL,
  key         text NOT NULL,
  description text,
  dtmf_digit  text,
  ring_strategy text DEFAULT 'sequential',
  voicemail_enabled boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS phone_departments_org_key_idx ON phone_departments(org_id, name);

ALTER TABLE phone_departments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='phone_departments' AND policyname='org_access') THEN
    CREATE POLICY org_access ON phone_departments
      USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Seed default departments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM phone_departments WHERE org_id='d34a6c47-1ac0-4008-87d2-0f7741eebc4f' AND name='Sales') THEN
    INSERT INTO phone_departments (org_id, name, key, description, dtmf_digit) VALUES
      ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Sales',      'sales',      'New estimates and sales inquiries', '1'),
      ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Production', 'production', 'Job status and production updates', '2'),
      ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'General',    'general',    'General inquiries',                 '0');
  END IF;
END $$;

-- ── phone_agents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_agents (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL,
  department_id uuid REFERENCES phone_departments(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_available  boolean DEFAULT true,
  priority      int DEFAULT 1,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE phone_agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='phone_agents' AND policyname='org_access') THEN
    CREATE POLICY org_access ON phone_agents
      USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ── call_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                uuid NOT NULL,
  twilio_call_sid       text UNIQUE,
  from_number           text,
  to_number             text,
  direction             text CHECK (direction IN ('inbound','outbound')),
  status                text,
  duration_seconds      int,
  recording_url         text,
  voicemail_url         text,
  voicemail_transcript  text,
  department_id         uuid REFERENCES phone_departments(id) ON DELETE SET NULL,
  agent_id              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  missed_sms_sent       boolean DEFAULT false,
  conversation_id       uuid,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='call_logs' AND policyname='org_access') THEN
    CREATE POLICY org_access ON call_logs
      USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ── sms_templates ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_templates (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id     uuid NOT NULL,
  name       text NOT NULL,
  body       text NOT NULL,
  category   text DEFAULT 'general',
  variables  text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sms_templates' AND policyname='org_access') THEN
    CREATE POLICY org_access ON sms_templates
      USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Seed default SMS templates
INSERT INTO sms_templates (org_id, name, body, category, variables) VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Appointment Reminder',
   'Hi {{contact_name}}, this is a reminder about your appointment tomorrow. Reply CONFIRM to confirm or call us to reschedule.',
   'appointments', ARRAY['contact_name']),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Job Ready for Pickup',
   'Great news {{contact_name}}! Your vehicle wrap is complete and ready for pickup. Give us a call to schedule your installation appointment.',
   'jobs', ARRAY['contact_name']),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Estimate Follow-up',
   'Hi {{contact_name}}, following up on the estimate we sent over. Any questions? We''d love to get your project started!',
   'sales', ARRAY['contact_name']),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Missed Call',
   'Hi, we missed your call at USA Wrap Co! Give us a ring back or reply here and we''ll get right with you.',
   'general', NULL),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Thank You',
   'Thank you {{contact_name}} for choosing USA Wrap Co! We appreciate your business. If you have any questions about your wrap, don''t hesitate to reach out.',
   'general', ARRAY['contact_name']),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f',
   'Proof Ready',
   'Hi {{contact_name}}, your design proof is ready for review! Check your email or log into your portal to approve or request changes.',
   'jobs', ARRAY['contact_name'])
ON CONFLICT DO NOTHING;
