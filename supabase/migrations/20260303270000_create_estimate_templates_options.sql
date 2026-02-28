-- Create estimate_templates table
-- EstimateDetailClient saves/loads line item templates from here
CREATE TABLE IF NOT EXISTS estimate_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  category    text,
  line_items  jsonb   DEFAULT '[]'::jsonb,
  use_count   integer DEFAULT 0,
  created_by  uuid    REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Create estimate_options table
-- Portal proposal page reads A/B/C package options per estimate
CREATE TABLE IF NOT EXISTS estimate_options (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES orgs(id) ON DELETE CASCADE,
  estimate_id   uuid REFERENCES estimates(id) ON DELETE CASCADE,
  label         text,
  sort_order    integer DEFAULT 0,
  selected      boolean DEFAULT false,
  line_item_ids jsonb   DEFAULT '[]'::jsonb,
  created_at    timestamptz DEFAULT now()
);

-- RLS: org-scoped
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_options   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members access estimate_templates"
  ON estimate_templates FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org members access estimate_options"
  ON estimate_options FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
