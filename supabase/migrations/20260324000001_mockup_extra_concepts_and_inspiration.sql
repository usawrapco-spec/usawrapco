-- Add concept D/E/F columns, wrap_coverage, and inspiration_urls to mockup_results
ALTER TABLE mockup_results
  ADD COLUMN IF NOT EXISTS concept_d_url     text,
  ADD COLUMN IF NOT EXISTS concept_e_url     text,
  ADD COLUMN IF NOT EXISTS concept_f_url     text,
  ADD COLUMN IF NOT EXISTS wrap_coverage     text DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS inspiration_urls  text[] DEFAULT '{}';
