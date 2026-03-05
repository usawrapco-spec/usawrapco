-- Add upsell tracking and installation notes to survey vehicles
ALTER TABLE estimate_survey_vehicles
  ADD COLUMN IF NOT EXISTS handle_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mirror_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS install_notes text;
