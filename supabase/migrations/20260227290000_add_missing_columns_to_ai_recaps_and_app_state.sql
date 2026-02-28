-- Add missing columns to ai_recaps (used by ai/recap and ai/job-recap routes)
ALTER TABLE ai_recaps
  ADD COLUMN IF NOT EXISTS recap_text text,
  ADD COLUMN IF NOT EXISTS sections jsonb,
  ADD COLUMN IF NOT EXISTS action_items jsonb,
  ADD COLUMN IF NOT EXISTS cached_until timestamptz,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recap_data jsonb;

-- Add key/value columns to app_state (used by ai/save-settings route with onConflict: 'org_id,key')
ALTER TABLE app_state
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS value jsonb;

-- Add unique constraint for app_state (org_id, key) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_state_org_id_key_unique'
  ) THEN
    ALTER TABLE app_state ADD CONSTRAINT app_state_org_id_key_unique UNIQUE (org_id, key);
  END IF;
END $$;
