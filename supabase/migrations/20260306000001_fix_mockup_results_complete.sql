-- Ensure all mockup_results columns required by the pipeline exist
-- Safe: uses ADD COLUMN IF NOT EXISTS — idempotent if already applied

ALTER TABLE mockup_results
  ADD COLUMN IF NOT EXISTS customer_id       uuid REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS concept_d_url     text,
  ADD COLUMN IF NOT EXISTS concept_e_url     text,
  ADD COLUMN IF NOT EXISTS concept_f_url     text,
  ADD COLUMN IF NOT EXISTS wrap_coverage     text DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS inspiration_urls  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS boat_sub_type     text;

CREATE INDEX IF NOT EXISTS idx_mockup_results_customer ON mockup_results(customer_id);

-- Backfill customer_id from linked projects
UPDATE mockup_results mr
SET customer_id = p.customer_id
FROM projects p
WHERE mr.project_id = p.id
  AND mr.customer_id IS NULL
  AND p.customer_id IS NOT NULL;
