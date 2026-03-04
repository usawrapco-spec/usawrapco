-- Add multi-concept and signage support to mockup_results
ALTER TABLE mockup_results
  ADD COLUMN IF NOT EXISTS concept_a_url     text,
  ADD COLUMN IF NOT EXISTS concept_b_url     text,
  ADD COLUMN IF NOT EXISTS concept_c_url     text,
  ADD COLUMN IF NOT EXISTS selected_concept  text DEFAULT 'a',
  ADD COLUMN IF NOT EXISTS output_type       text DEFAULT 'wrap',
  ADD COLUMN IF NOT EXISTS sign_type         text,
  ADD COLUMN IF NOT EXISTS sign_width_in     numeric,
  ADD COLUMN IF NOT EXISTS sign_height_in    numeric;
