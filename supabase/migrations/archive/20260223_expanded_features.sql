-- ══════════════════════════════════════════════════════════════════════════════
-- USA WRAP CO — Expanded Features Migration
-- Payment Schedules, Time Entries, Vehicle Check-ins, Portal Tokens
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Payment Schedule System ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  schedule_type TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES payment_schedules(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  amount_type TEXT CHECK (amount_type IN ('flat', 'percentage')),
  amount_value DECIMAL(10,2),
  due_trigger TEXT CHECK (due_trigger IN ('at_approval', 'before_start', 'at_pickup', 'on_date', 'net_days')),
  due_days_offset INT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Time Entries (Installer Time Tracking) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  entry_type TEXT DEFAULT 'install',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vehicle Check-ins ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vin VARCHAR(17),
  year INT,
  make TEXT,
  model TEXT,
  color TEXT,
  odometer INT,
  license_plate TEXT,
  vehicle_type TEXT DEFAULT 'sedan',
  checked_in_by UUID REFERENCES profiles(id),
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  damage_markers JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  general_notes TEXT,
  customer_signature_url TEXT,
  customer_present BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Portal Token for Sales Orders ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'portal_token'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN portal_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT;
  END IF;
END $$;

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- Payment Schedules
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view payment schedules for their org" ON payment_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_orders so
      JOIN profiles p ON p.org_id = so.org_id
      WHERE so.id = payment_schedules.sales_order_id
        AND p.id = auth.uid()
    )
  );

-- Payment Milestones
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage payment milestones" ON payment_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payment_schedules ps
      JOIN sales_orders so ON so.id = ps.sales_order_id
      JOIN profiles p ON p.org_id = so.org_id
      WHERE ps.id = payment_milestones.schedule_id
        AND p.id = auth.uid()
    )
  );

-- Time Entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own time entries" ON time_entries
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Vehicle Check-ins
ALTER TABLE vehicle_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage vehicle checkins for their org" ON vehicle_checkins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles pr ON pr.org_id = p.org_id
      WHERE p.id = vehicle_checkins.job_id
        AND pr.id = auth.uid()
    )
  );

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_schedules_so ON payment_schedules(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_schedule ON payment_milestones(schedule_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkins_job ON vehicle_checkins(job_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_portal_token ON sales_orders(portal_token);
