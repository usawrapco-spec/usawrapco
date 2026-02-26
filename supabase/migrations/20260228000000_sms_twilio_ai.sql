-- SMS Conversations, Messages, and App Settings
-- New tables for the Twilio SMS / AI agent system.
-- call_logs already exists (20260225140000_phone_system.sql) — not recreated here.

-- ── SMS Conversations (one row per contact phone thread) ───────────────────────
CREATE TABLE IF NOT EXISTS sms_conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid,
  contact_phone    text NOT NULL,
  contact_name     text,
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  last_message     text,
  last_message_at  timestamptz,
  unread_count     int  NOT NULL DEFAULT 0,
  ai_enabled       boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'open',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_convos_org_phone_idx ON sms_conversations (org_id, contact_phone);
CREATE INDEX IF NOT EXISTS sms_convos_last_msg_idx  ON sms_conversations (last_message_at DESC);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_sms_conversations"
  ON sms_conversations FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── SMS Messages (individual messages in a thread) ─────────────────────────────
CREATE TABLE IF NOT EXISTS sms_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  direction        text NOT NULL, -- 'inbound' | 'outbound'
  body             text NOT NULL,
  from_number      text,
  to_number        text,
  twilio_sid       text,
  ai_generated     boolean NOT NULL DEFAULT false,
  status           text    NOT NULL DEFAULT 'sent',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_messages_convo_idx ON sms_messages (conversation_id, created_at);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_sms_messages"
  ON sms_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM sms_conversations
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ── App Settings (global key-value store per org) ──────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid,
  key        text NOT NULL,
  value      text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, key)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "org_access_app_settings"
  ON app_settings FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Seed default: AI auto-respond = enabled
INSERT INTO app_settings (org_id, key, value)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'ai_sms_enabled', 'true')
ON CONFLICT (org_id, key) DO NOTHING;
