-- Add missing columns to orgs table
-- OrgSettingsClient updates these but they didn't exist in DB
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS logo_url    text,
  ADD COLUMN IF NOT EXISTS settings    jsonb    DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();
