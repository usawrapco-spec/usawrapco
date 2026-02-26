-- ═══════════════════════════════════════════════════════════════════════════════
-- PAYROLL, MILEAGE, AND EXPENSE SYSTEM — v7.0
-- Adds: mileage_logs, expense_reports, payroll_runs, payroll_line_items,
--       employee_advances, company_vehicles, vehicle_maintenance,
--       employee_pay_settings (upsert-safe)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── employee_pay_settings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_pay_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  pay_type                TEXT DEFAULT 'hourly'
    CHECK (pay_type IN ('hourly','salary','commission_only','per_job','percent_job','hybrid')),
  hourly_rate             NUMERIC(8,2) DEFAULT 0,
  salary_amount           NUMERIC(10,2) DEFAULT 0,
  salary_period           TEXT DEFAULT 'biweekly' CHECK (salary_period IN ('weekly','biweekly','monthly')),
  per_job_rate            NUMERIC(8,2) DEFAULT 0,
  percent_job_rate        NUMERIC(5,4) DEFAULT 0,
  commission_rate         NUMERIC(5,4) DEFAULT 0,
  overtime_eligible       BOOLEAN DEFAULT true,
  overtime_threshold_day  NUMERIC(4,1) DEFAULT 8,
  overtime_threshold_week NUMERIC(4,1) DEFAULT 40,
  rush_job_bonus          NUMERIC(8,2) DEFAULT 0,
  holiday_multiplier      NUMERIC(4,2) DEFAULT 1.5,
  mileage_rate            NUMERIC(6,4) DEFAULT 0.67,
  uses_company_vehicle    BOOLEAN DEFAULT false,
  vehicle_id              UUID,
  pay_period_type         TEXT DEFAULT 'biweekly' CHECK (pay_period_type IN ('weekly','biweekly')),
  worker_type             TEXT DEFAULT 'w2' CHECK (worker_type IN ('w2','contractor')),
  gusto_employee_id       TEXT,
  auto_approve_expenses_under NUMERIC(8,2) DEFAULT 25,
  require_odometer_photos_over NUMERIC(8,2) DEFAULT 100,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── mileage_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mileage_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES projects(id) ON DELETE SET NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type       TEXT DEFAULT 'manual' CHECK (entry_type IN ('manual','gps')),
  from_address     TEXT,
  to_address       TEXT,
  miles            NUMERIC(8,2) NOT NULL DEFAULT 0,
  rate_per_mile    NUMERIC(6,4) NOT NULL DEFAULT 0.67,
  total_amount     NUMERIC(10,2) GENERATED ALWAYS AS (miles * rate_per_mile) STORED,
  purpose          TEXT,
  vehicle_type     TEXT DEFAULT 'personal' CHECK (vehicle_type IN ('personal','company')),
  company_vehicle_id UUID,
  odometer_start   NUMERIC(10,0),
  odometer_end     NUMERIC(10,0),
  odometer_start_photo_url TEXT,
  odometer_end_photo_url   TEXT,
  route_data       JSONB DEFAULT '[]',   -- array of {lat,lng,ts} waypoints
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),
  approved_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  payroll_run_id   UUID,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_user ON mileage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_org  ON mileage_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_date ON mileage_logs(date);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_status ON mileage_logs(status);

-- ─── expense_reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id           UUID REFERENCES projects(id) ON DELETE SET NULL,
  category         TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'fuel','tools','supplies','materials','parking','tolls',
      'meals','lodging','uniform','training','other'
    )),
  amount           NUMERIC(10,2) NOT NULL,
  currency         TEXT DEFAULT 'USD',
  expense_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  description      TEXT NOT NULL,
  receipt_url      TEXT,
  payment_method   TEXT DEFAULT 'personal_card'
    CHECK (payment_method IN ('personal_card','cash','company_card','other')),
  -- AI-extracted receipt data
  merchant_name    TEXT,
  ai_extracted     BOOLEAN DEFAULT false,
  -- Approval workflow
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid','info_requested')),
  approved_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  manager_notes    TEXT,
  payroll_run_id   UUID,
  -- Flags
  flagged          BOOLEAN DEFAULT false,
  flag_reason      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_reports_user   ON expense_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_org    ON expense_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status);
CREATE INDEX IF NOT EXISTS idx_expense_reports_date   ON expense_reports(expense_date);

-- ─── payroll_runs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES orgs(id) ON DELETE CASCADE,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  pay_date       DATE,
  status         TEXT DEFAULT 'open'
    CHECK (status IN ('open','reviewing','processing','processed','paid','cancelled')),
  total_gross    NUMERIC(12,2) DEFAULT 0,
  total_net      NUMERIC(12,2) DEFAULT 0,
  total_hours    NUMERIC(8,2) DEFAULT 0,
  employee_count INT DEFAULT 0,
  notes          TEXT,
  processed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at   TIMESTAMPTZ,
  gusto_sync_id  TEXT,
  gusto_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org    ON payroll_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- ─── payroll_line_items ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_line_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
    CHECK (type IN (
      'regular_hours','overtime_hours','salary','per_job',
      'commission','mileage','expense','bonus',
      'advance_deduction','holiday_pay','pto','other'
    )),
  description    TEXT,
  hours          NUMERIC(8,2),
  rate           NUMERIC(10,4),
  amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  reference_id   UUID,   -- points to mileage_logs.id, expense_reports.id, etc.
  reference_type TEXT,   -- 'mileage_log','expense_report','project','advance'
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_line_items_run  ON payroll_line_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_items_user ON payroll_line_items(user_id);

-- ─── employee_advances ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_advances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount              NUMERIC(10,2) NOT NULL,
  remaining_balance   NUMERIC(10,2) NOT NULL,
  reason              TEXT,
  deduction_per_period NUMERIC(10,2),
  deduction_schedule  TEXT DEFAULT 'next_paycheck'
    CHECK (deduction_schedule IN ('next_paycheck','split_2','split_3','split_4','manual')),
  fully_repaid        BOOLEAN DEFAULT false,
  employee_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at     TIMESTAMPTZ,
  issued_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_advances_user ON employee_advances(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_org  ON employee_advances(org_id);

-- ─── company_vehicles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_vehicles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID REFERENCES orgs(id) ON DELETE CASCADE,
  make                TEXT NOT NULL,
  model               TEXT NOT NULL,
  year                INT,
  color               TEXT,
  plate               TEXT,
  vin                 TEXT,
  assigned_to         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_mileage     NUMERIC(10,0) DEFAULT 0,
  insurance_expiry    DATE,
  registration_expiry DATE,
  last_oil_change_miles NUMERIC(10,0),
  next_oil_change_miles NUMERIC(10,0),
  notes               TEXT,
  active              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_vehicles_org         ON company_vehicles(org_id);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_assigned_to ON company_vehicles(assigned_to);

-- ─── vehicle_maintenance ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID REFERENCES company_vehicles(id) ON DELETE CASCADE,
  org_id           UUID REFERENCES orgs(id) ON DELETE CASCADE,
  type             TEXT NOT NULL
    CHECK (type IN ('oil_change','tires','inspection','repair','registration','insurance','other')),
  description      TEXT,
  cost             NUMERIC(10,2) DEFAULT 0,
  mileage_at_service NUMERIC(10,0),
  next_service_due_miles NUMERIC(10,0),
  next_service_due_date  DATE,
  receipt_url      TEXT,
  performed_by     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle ON vehicle_maintenance(vehicle_id);

-- ─── Add payroll_run_id FK to mileage_logs and expense_reports ───────────────
ALTER TABLE mileage_logs
  ADD CONSTRAINT fk_mileage_payroll_run
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE expense_reports
  ADD CONSTRAINT fk_expense_payroll_run
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE SET NULL
  NOT VALID;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

-- employee_pay_settings
ALTER TABLE employee_pay_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_settings_own_read" ON employee_pay_settings FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "pay_settings_admin_write" ON employee_pay_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

-- mileage_logs
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mileage_logs_own_read" ON mileage_logs FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "mileage_logs_own_insert" ON mileage_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "mileage_logs_own_update" ON mileage_logs FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "mileage_logs_admin_delete" ON mileage_logs FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

-- expense_reports
ALTER TABLE expense_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_own_read" ON expense_reports FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "expenses_own_insert" ON expense_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "expenses_own_update" ON expense_reports FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "expenses_admin_delete" ON expense_reports FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

-- payroll_runs
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_admin_only" ON payroll_runs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

-- payroll_line_items
ALTER TABLE payroll_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "line_items_own_read" ON payroll_line_items FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "line_items_admin_write" ON payroll_line_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

-- employee_advances
ALTER TABLE employee_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advances_own_read" ON employee_advances FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "advances_admin_write" ON employee_advances FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
CREATE POLICY "advances_own_acknowledge" ON employee_advances FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- company_vehicles
ALTER TABLE company_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_read_all" ON company_vehicles FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vehicles_admin_write" ON company_vehicles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

-- vehicle_maintenance
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_read_all" ON vehicle_maintenance FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "maintenance_admin_write" ON vehicle_maintenance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));
