-- ============================================================
-- Fix: missing tables, missing columns, and missing FK constraints
-- Found during Phase 3 DB connectivity audit (2026-02-27)
-- ============================================================

-- 1. Add missing columns to employee_pay_settings
ALTER TABLE employee_pay_settings
  ADD COLUMN IF NOT EXISTS salary_period      text    DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS per_job_rate       numeric,
  ADD COLUMN IF NOT EXISTS percent_job_rate   numeric,
  ADD COLUMN IF NOT EXISTS pay_period_type    text    DEFAULT 'biweekly',
  ADD COLUMN IF NOT EXISTS worker_type        text    DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS overtime_eligible  boolean DEFAULT true;

-- 2. Create job_renders table
CREATE TABLE IF NOT EXISTS job_renders (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid        NOT NULL,
  project_id    uuid        REFERENCES projects(id) ON DELETE CASCADE,
  status        text        DEFAULT 'pending', -- pending | processing | succeeded | failed
  render_type   text,
  file_url      text,
  thumbnail_url text,
  requested_by  uuid        REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE job_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_renders_org_select" ON job_renders
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "job_renders_org_insert" ON job_renders
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- 3. Create gusto_exports table
CREATE TABLE IF NOT EXISTS gusto_exports (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid        NOT NULL,
  payroll_run_id  uuid,
  export_type     text        NOT NULL, -- w2 | 1099 | hours
  period_start    date        NOT NULL,
  period_end      date        NOT NULL,
  file_name       text,
  row_count       integer     DEFAULT 0,
  total_amount    numeric     DEFAULT 0,
  csv_data        text,
  exported_by     uuid        REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE gusto_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gusto_exports_admin_select" ON gusto_exports
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "gusto_exports_admin_insert" ON gusto_exports
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 4. Add FK: invoices.so_id → sales_orders.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_so_id_fkey' AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_so_id_fkey
      FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Add FK: payments.invoice_id → invoices.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_invoice_id_fkey' AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;
