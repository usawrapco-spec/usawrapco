-- Add feature_permissions JSONB column to profiles for granular per-user feature access control
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feature_permissions jsonb DEFAULT '{}'::jsonb;
