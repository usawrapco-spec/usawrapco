-- Add missing columns to install_sessions
-- InstallerPortalClient uses start_time/end_time/duration_hours/status
-- while DB only had started_at/ended_at/duration_seconds
ALTER TABLE install_sessions
  ADD COLUMN IF NOT EXISTS start_time      timestamptz,
  ADD COLUMN IF NOT EXISTS end_time        timestamptz,
  ADD COLUMN IF NOT EXISTS duration_hours  numeric,
  ADD COLUMN IF NOT EXISTS status          text DEFAULT 'active';
