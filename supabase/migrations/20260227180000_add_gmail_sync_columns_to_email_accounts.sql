-- Add Gmail sync tracking columns to email_accounts
ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS gmail_history_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
