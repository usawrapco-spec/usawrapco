-- ── Unified multi-channel inbox ──────────────────────────────────────────────
-- Adds: MMS media_urls, call/voicemail fields, SMS template library,
--       performance indices for assign/status filters.

-- Extend conversation_messages with MMS and voice fields
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS media_urls              text[],
  ADD COLUMN IF NOT EXISTS call_duration_seconds   int,
  ADD COLUMN IF NOT EXISTS call_recording_url      text,
  ADD COLUMN IF NOT EXISTS voicemail_url           text,
  ADD COLUMN IF NOT EXISTS voicemail_transcription text;

-- SMS template library
CREATE TABLE IF NOT EXISTS sms_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL,
  name       text        NOT NULL,
  body       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_templates_org_rls" ON sms_templates
  FOR ALL USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Seed default SMS templates for the primary org
INSERT INTO sms_templates (org_id, name, body) VALUES
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Appointment Reminder',
   'Hi {{contact_name}}, just a reminder about your upcoming appointment at USA Wrap Co. Reply with any questions!'),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Job Ready for Pickup',
   'Hi {{contact_name}}, great news — your vehicle is ready for pickup at USA Wrap Co! Give us a call if you need anything.'),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Quote Follow-up',
   'Hi {{contact_name}}, following up on your wrap quote from USA Wrap Co. Ready to move forward, or have questions?'),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Install Complete',
   'Hi {{contact_name}}, your vehicle wrap installation is complete! We hope you love it. A Google review means the world to us.'),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Payment Due',
   'Hi {{contact_name}}, this is a friendly reminder that your balance at USA Wrap Co is due. Reply to arrange payment.'),
  ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 'Design Proof Ready',
   'Hi {{contact_name}}, your wrap design proof is ready for review! Check your email or reply to this text.')
ON CONFLICT DO NOTHING;

-- Indices for fast assignment + status filtering
CREATE INDEX IF NOT EXISTS idx_conversations_assigned
  ON conversations (org_id, assigned_to);

CREATE INDEX IF NOT EXISTS idx_conversations_status
  ON conversations (org_id, status);

CREATE INDEX IF NOT EXISTS idx_conv_messages_channel
  ON conversation_messages (conversation_id, channel);
