-- Customer Saved Renders + customer_id on mockup_results
-- Allows tracking which renders customers like and their design journey

-- 1. New table: customer_saved_renders
CREATE TABLE IF NOT EXISTS customer_saved_renders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id      uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mockup_result_id uuid REFERENCES mockup_results(id) ON DELETE SET NULL,
  image_url        text NOT NULL,
  label            text,
  source           text DEFAULT 'mockup_pipeline',
  metadata         jsonb DEFAULT '{}',
  created_at       timestamptz DEFAULT now(),
  UNIQUE(customer_id, image_url)
);

CREATE INDEX idx_csr_customer ON customer_saved_renders(customer_id);
CREATE INDEX idx_csr_org ON customer_saved_renders(org_id);
CREATE INDEX idx_csr_created ON customer_saved_renders(created_at DESC);

ALTER TABLE customer_saved_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_saved_renders" ON customer_saved_renders
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "org_manage_saved_renders" ON customer_saved_renders
  FOR ALL USING (org_id = get_my_org_id());

-- 2. Add customer_id to mockup_results for direct customer lookups
ALTER TABLE mockup_results
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mockup_results_customer ON mockup_results(customer_id);

-- 3. Backfill existing mockup_results from projects
UPDATE mockup_results mr
SET customer_id = p.customer_id
FROM projects p
WHERE mr.project_id = p.id
  AND mr.customer_id IS NULL
  AND p.customer_id IS NOT NULL;
