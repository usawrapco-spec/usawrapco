-- ── Rate Card + Payroll Records migration ─────────────────────────────────────
-- NOTE: vehicle_measurements table already exists (global vehicle database)
-- Creates: rate_card_settings, installer_payroll_records

-- ── rate_card_settings (org-level install rate assumptions) ───────────────────
CREATE TABLE IF NOT EXISTS rate_card_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL UNIQUE,
  install_rate_hr   numeric(8,2) DEFAULT 35,
  production_speed  numeric(8,4) DEFAULT 35.71,   -- sqft / hr
  material_per_sqft numeric(8,4) DEFAULT 2.10,
  design_fee        numeric(8,2) DEFAULT 150,
  max_cost_pct      numeric(5,2) DEFAULT 25,       -- 0-100
  updated_at        timestamptz DEFAULT now(),
  updated_by        uuid
);

ALTER TABLE rate_card_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_card_settings_select"
  ON rate_card_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "rate_card_settings_all"
  ON rate_card_settings FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- ── installer_payroll_records (locked installer pay period snapshots) ──────────
CREATE TABLE IF NOT EXISTS installer_payroll_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  period_start      date NOT NULL,
  period_end        date NOT NULL,
  gusto_hours       numeric(8,2) DEFAULT 0,
  base_hourly_rate  numeric(8,2) DEFAULT 25,
  breakdown         jsonb DEFAULT '{}',
  total_job_pay     numeric(10,2) DEFAULT 0,
  total_regular_pay numeric(10,2) DEFAULT 0,
  total_fica        numeric(10,2) DEFAULT 0,
  total_cage_pay    numeric(10,2) DEFAULT 0,
  locked_at         timestamptz,
  locked_by         uuid,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE installer_payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installer_payroll_records_all"
  ON installer_payroll_records FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

-- ── Seed default rate_card_settings ──────────────────────────────────────────
INSERT INTO rate_card_settings (org_id, install_rate_hr, production_speed, material_per_sqft, design_fee, max_cost_pct)
VALUES ('d34a6c47-1ac0-4008-87d2-0f7741eebc4f', 35, 35.71, 2.10, 150, 25)
ON CONFLICT (org_id) DO NOTHING;
