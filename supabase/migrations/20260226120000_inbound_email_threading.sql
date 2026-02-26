-- Add email Message-ID column for reply threading
-- Stores the SMTP Message-ID header so inbound replies can be matched
-- to the original outbound message

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS email_message_id text;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_email_message_id
  ON conversation_messages (email_message_id)
  WHERE email_message_id IS NOT NULL;
