-- Add user tracking columns to email_accounts (used by Gmail OAuth callback)
ALTER TABLE email_accounts
  ADD COLUMN IF NOT EXISTS connected_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id);
