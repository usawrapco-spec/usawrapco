-- Add AI tagging columns to media_files
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS ai_description text,
  ADD COLUMN IF NOT EXISTS ai_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vehicle_type_tag text,
  ADD COLUMN IF NOT EXISTS wrap_type_tag text,
  ADD COLUMN IF NOT EXISTS color_tags text[] DEFAULT '{}';

-- Add missing columns to work_summaries
ALTER TABLE work_summaries
  ADD COLUMN IF NOT EXISTS raw_notes text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS hours_logged numeric(6,2),
  ADD COLUMN IF NOT EXISTS tasks_completed jsonb DEFAULT '[]';
