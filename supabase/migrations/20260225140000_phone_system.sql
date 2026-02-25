-- Phone System Tables (Twilio IVR integration)
-- Tables may already exist in production; all statements use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS phone_system (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  main_number           text,
  greeting_text         text NOT NULL DEFAULT 'Thank you for calling USA Wrap Co.',
  hold_music_url        text DEFAULT 'https://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3',
  business_hours        jsonb NOT NULL DEFAULT '{"monday":{"open":"08:00","close":"17:00","enabled":true},"tuesday":{"open":"08:00","close":"17:00","enabled":true},"wednesday":{"open":"08:00","close":"17:00","enabled":true},"thursday":{"open":"08:00","close":"17:00","enabled":true},"friday":{"open":"08:00","close":"17:00","enabled":true},"saturday":{"open":"09:00","close":"14:00","enabled":false},"sunday":{"open":"09:00","close":"14:00","enabled":false}}'::jsonb,
  timezone              text NOT NULL DEFAULT 'America/Los_Angeles',
  after_hours_text      text NOT NULL DEFAULT 'Our office is currently closed. Please leave a message and we will return your call next business day.',
  max_queue_wait_seconds int NOT NULL DEFAULT 180,
  ring_timeout_seconds  int NOT NULL DEFAULT 25,
  auto_sms_on_miss      boolean NOT NULL DEFAULT true,
  record_all_calls      boolean NOT NULL DEFAULT true,
  enabled               boolean NOT NULL DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(org_id)
);

CREATE TABLE IF NOT EXISTS phone_departments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name              text NOT NULL,
  dtmf_key          text NOT NULL,
  description       text,
  voicemail_greeting text,
  voicemail_email   text,
  round_robin_index int NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phone_agents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  profile_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id     uuid REFERENCES phone_departments(id) ON DELETE SET NULL,
  cell_number       text NOT NULL,
  display_name      text,
  round_robin_order int NOT NULL DEFAULT 0,
  is_available      boolean NOT NULL DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  twilio_call_sid       text UNIQUE,
  direction             text NOT NULL DEFAULT 'inbound',
  from_number           text,
  to_number             text,
  caller_name           text,
  status                text NOT NULL DEFAULT 'initiated',
  duration_seconds      int DEFAULT 0,
  recording_url         text,
  recording_sid         text,
  voicemail_url         text,
  voicemail_transcript  text,
  notes                 text,
  answered_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id         uuid REFERENCES phone_departments(id) ON DELETE SET NULL,
  project_id            uuid REFERENCES projects(id) ON DELETE SET NULL,
  customer_id           uuid REFERENCES customers(id) ON DELETE SET NULL,
  transfer_to           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  started_at            timestamptz DEFAULT now(),
  ended_at              timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE phone_system     ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_agents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs         ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "org_access_phone_system"     ON phone_system     FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "org_access_phone_departments" ON phone_departments FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "org_access_phone_agents"     ON phone_agents      FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "org_access_call_logs"        ON call_logs         FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
