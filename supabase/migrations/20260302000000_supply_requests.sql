-- Supply requests table for installer supply management
CREATE TABLE IF NOT EXISTS supply_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ordered','delivered','cancelled')),
  items jsonb NOT NULL DEFAULT '[]',
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','emergency')),
  needed_by date,
  notes text,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_requests_select" ON supply_requests FOR SELECT
  USING (
    auth.uid() = requested_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin','production'))
  );

CREATE POLICY "supply_requests_insert" ON supply_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "supply_requests_update" ON supply_requests FOR UPDATE
  USING (
    (auth.uid() = requested_by AND status = 'pending')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','admin','production'))
  );
