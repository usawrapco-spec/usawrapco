CREATE TABLE IF NOT EXISTS proposal_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name         text NOT NULL,
  description  text,
  message      text,
  closing_message text,
  terms_conditions text,
  deposit_amount numeric(10,2) DEFAULT 250,
  packages     jsonb DEFAULT '[]'::jsonb,
  upsells      jsonb DEFAULT '[]'::jsonb,
  use_count    integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read proposal_templates"
  ON proposal_templates FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = proposal_templates.org_id));

CREATE POLICY "org members manage proposal_templates"
  ON proposal_templates FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE org_id = proposal_templates.org_id));

CREATE INDEX proposal_templates_org_idx ON proposal_templates(org_id);
