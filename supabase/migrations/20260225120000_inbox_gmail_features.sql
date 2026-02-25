-- Gmail-like features for inbox: CC/BCC, starred, archived, labels, contact roles

-- Add CC/BCC to conversation messages
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS cc text[],
  ADD COLUMN IF NOT EXISTS bcc text[];

-- Add Gmail-like features to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_starred bool DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS is_archived bool DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS is_decision_maker bool DEFAULT false;

-- Index for fast starred/archived queries
CREATE INDEX IF NOT EXISTS idx_conversations_starred ON conversations (org_id, is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations (org_id, is_archived);
