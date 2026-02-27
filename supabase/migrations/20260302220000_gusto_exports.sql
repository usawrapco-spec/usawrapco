-- Gusto export history table
CREATE TABLE IF NOT EXISTS gusto_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  payroll_run_id  UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  export_type     TEXT NOT NULL DEFAULT 'w2' CHECK (export_type IN ('w2','1099','hours')),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  file_name       TEXT NOT NULL,
  row_count       INTEGER NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  csv_data        TEXT,
  exported_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gusto_exports_org ON gusto_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_gusto_exports_run ON gusto_exports(payroll_run_id);

ALTER TABLE gusto_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read gusto exports"
  ON gusto_exports FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admins can manage gusto exports"
  ON gusto_exports FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')));
