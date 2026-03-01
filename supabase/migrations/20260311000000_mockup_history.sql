-- mockup_history: tracks all AI-generated wrap mockups
CREATE TABLE IF NOT EXISTS mockup_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_year    text,
  vehicle_make    text,
  vehicle_model   text,
  vehicle_color   text,
  view_angle      text,
  wrap_style      text,
  brand_data      jsonb DEFAULT '{}',
  prompt_used     text,
  result_url      text,
  design_score    int CHECK (design_score >= 1 AND design_score <= 10),
  brand_analysis  jsonb DEFAULT '{}',
  generated_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE mockup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view mockup_history"
  ON mockup_history FOR SELECT
  USING (org_id = get_my_org_id());

CREATE POLICY "org members can insert mockup_history"
  ON mockup_history FOR INSERT
  WITH CHECK (org_id = get_my_org_id());

-- Indexes
CREATE INDEX IF NOT EXISTS mockup_history_org_id_idx ON mockup_history(org_id);
CREATE INDEX IF NOT EXISTS mockup_history_project_id_idx ON mockup_history(project_id);
CREATE INDEX IF NOT EXISTS mockup_history_customer_id_idx ON mockup_history(customer_id);
CREATE INDEX IF NOT EXISTS mockup_history_created_at_idx ON mockup_history(created_at DESC);
