-- ============================================================
-- Installer Management System - Full Schema
-- ============================================================

-- Installer assignments (multiple installers per job)
CREATE TABLE IF NOT EXISTS installer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  role text DEFAULT 'installer',
  split_percentage numeric DEFAULT 100,
  status text DEFAULT 'assigned',
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Installer supply requests
CREATE TABLE IF NOT EXISTS supply_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  items jsonb DEFAULT '[]',
  urgency text DEFAULT 'normal',
  needed_by date,
  notes text,
  approved_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Installer income tracking
CREATE TABLE IF NOT EXISTS installer_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  installer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES installer_assignments(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  type text DEFAULT 'job',
  status text DEFAULT 'pending',
  pay_period_start date,
  pay_period_end date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Shop reports from install manager
CREATE TABLE IF NOT EXISTS shop_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  report_type text,
  title text,
  content jsonb,
  status text DEFAULT 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Installer schedule / calendar
CREATE TABLE IF NOT EXISTS installer_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  installer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES installer_assignments(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  start_time time,
  end_time time,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Installer chat messages (reusing conversation pattern)
CREATE TABLE IF NOT EXISTS installer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  channel text DEFAULT 'team',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id uuid,
  body text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE installer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE installer_messages ENABLE ROW LEVEL SECURITY;

-- installer_assignments: installers see own, managers/admin see all
CREATE POLICY "installer_assignments_select" ON installer_assignments
  FOR SELECT USING (
    auth.uid() = installer_id
    OR auth.uid() = assigned_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_assignments.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_assignments_insert" ON installer_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_assignments.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_assignments_update" ON installer_assignments
  FOR UPDATE USING (
    auth.uid() = installer_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_assignments.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_assignments_delete" ON installer_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_assignments.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

-- supply_requests: installers see own, managers see all
CREATE POLICY "supply_requests_select" ON supply_requests
  FOR SELECT USING (
    auth.uid() = requested_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = supply_requests.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "supply_requests_insert" ON supply_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = supply_requests.org_id
    )
  );

CREATE POLICY "supply_requests_update" ON supply_requests
  FOR UPDATE USING (
    auth.uid() = requested_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = supply_requests.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

-- installer_earnings: installers see own, managers see all
CREATE POLICY "installer_earnings_select" ON installer_earnings
  FOR SELECT USING (
    auth.uid() = installer_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_earnings.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_earnings_insert" ON installer_earnings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_earnings.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_earnings_update" ON installer_earnings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_earnings.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

-- shop_reports: installers can submit, managers can read/update all
CREATE POLICY "shop_reports_select" ON shop_reports
  FOR SELECT USING (
    auth.uid() = submitted_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = shop_reports.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "shop_reports_insert" ON shop_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = shop_reports.org_id
    )
  );

CREATE POLICY "shop_reports_update" ON shop_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = shop_reports.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

-- installer_schedule: installers see own, managers see all
CREATE POLICY "installer_schedule_select" ON installer_schedule
  FOR SELECT USING (
    auth.uid() = installer_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_schedule.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_schedule_insert" ON installer_schedule
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_schedule.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_schedule_update" ON installer_schedule
  FOR UPDATE USING (
    auth.uid() = installer_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_schedule.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

CREATE POLICY "installer_schedule_delete" ON installer_schedule
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_schedule.org_id
      AND profiles.role IN ('owner', 'admin', 'production')
    )
  );

-- installer_messages: org members can read/write
CREATE POLICY "installer_messages_select" ON installer_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_messages.org_id
    )
  );

CREATE POLICY "installer_messages_insert" ON installer_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id = installer_messages.org_id
    )
  );
