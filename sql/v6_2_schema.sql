-- ============================================================
-- USA WRAP CO — v6.2 Schema Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Vehicle Database ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_database (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  year            TEXT NOT NULL,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  trim            TEXT,
  body_style      TEXT,
  sqft_full       NUMERIC,
  sqft_partial    NUMERIC,
  sqft_hood       NUMERIC,
  sqft_roof       NUMERIC,
  sqft_sides      NUMERIC,
  template_url    TEXT,
  template_scale  TEXT DEFAULT '1:20',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, year, make, model)
);

ALTER TABLE vehicle_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage vehicle database"
  ON vehicle_database FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_vehicle_db_org ON vehicle_database(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_db_search ON vehicle_database(org_id, year, make, model);


-- ── Time Entries (Employee Clock In/Out) ─────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  clock_in        TIMESTAMPTZ NOT NULL,
  clock_out       TIMESTAMPTZ,
  break_minutes   INTEGER DEFAULT 0,
  total_hours     NUMERIC,
  regular_hours   NUMERIC,
  overtime_hours  NUMERIC,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Employees can see their own entries; admins see all org entries
CREATE POLICY "Employees see own time entries"
  ON time_entries FOR SELECT
  USING (
    employee_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Employees manage own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees update own open entries"
  ON time_entries FOR UPDATE
  USING (
    employee_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_org ON time_entries(org_id, clock_in DESC);


-- ── PTO Requests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pto_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  hours           NUMERIC NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('sick','vacation','personal')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  approved_by     UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage own PTO requests"
  ON pto_requests FOR ALL
  USING (
    employee_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pto_employee ON pto_requests(employee_id);


-- ── Payroll Periods ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_periods (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','processing','closed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payroll periods"
  ON payroll_periods FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );


-- ── Payroll Entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_entries (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id           UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  regular_hours       NUMERIC DEFAULT 0,
  overtime_hours      NUMERIC DEFAULT 0,
  base_pay            NUMERIC DEFAULT 0,
  commission_earned   NUMERIC DEFAULT 0,
  bonus               NUMERIC DEFAULT 0,
  total_pay           NUMERIC DEFAULT 0,
  breakdown_json      JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payroll entries"
  ON payroll_entries FOR ALL
  USING (
    period_id IN (
      SELECT id FROM payroll_periods
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Employees can view their own payroll entries
CREATE POLICY "Employees view own payroll"
  ON payroll_entries FOR SELECT
  USING (employee_id = auth.uid());


-- ── Verify all tables created ────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'v6.2 schema migration complete.';
  RAISE NOTICE 'Tables created: vehicle_database, time_entries, pto_requests, payroll_periods, payroll_entries';
END
$$;
