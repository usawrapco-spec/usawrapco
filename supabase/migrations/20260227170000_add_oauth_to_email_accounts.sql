-- Add OAuth columns to email_accounts (for Gmail OAuth integration)
ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add missing columns to emails table
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS date timestamptz;
