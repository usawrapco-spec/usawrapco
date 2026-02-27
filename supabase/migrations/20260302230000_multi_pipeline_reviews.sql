-- ─── Multi-Pipeline support: add pipeline_type to projects ───────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pipeline_type TEXT NOT NULL DEFAULT 'wraps'
  CHECK (pipeline_type IN ('wraps','decking','ppf','marine'));

CREATE INDEX IF NOT EXISTS idx_projects_pipeline_type ON projects(pipeline_type);

-- ─── Enhance appointments table ─────────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS public_token TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT false;

-- Update status check to include tentative
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('tentative','confirmed','cancelled','completed','no_show','pending'));

CREATE INDEX IF NOT EXISTS idx_appointments_assigned ON appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_project ON appointments(project_id);
CREATE INDEX IF NOT EXISTS idx_appointments_token ON appointments(public_token);

-- ─── Review Requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','completed','failed','skipped')),
  method TEXT DEFAULT 'sms' CHECK (method IN ('sms','email','both')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  message_template TEXT,
  google_review_link TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_requests_org ON review_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_scheduled ON review_requests(scheduled_for);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_requests_org_select ON review_requests
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY review_requests_org_manage ON review_requests
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- ─── Review settings in shop_settings (or create separate table) ─────────────
CREATE TABLE IF NOT EXISTS review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  delay_hours INT NOT NULL DEFAULT 48,
  sms_template TEXT DEFAULT 'Hi {first_name}! Your vehicle wrap from USA Wrap Co is complete. We''d love your feedback! Leave us a Google review: {review_link}',
  email_template TEXT DEFAULT 'Hi {first_name},\n\nThank you for choosing USA Wrap Co! We hope you love your new wrap.\n\nWe''d really appreciate it if you could take a moment to leave us a Google review:\n{review_link}\n\nThank you!\nThe USA Wrap Co Team',
  google_review_link TEXT,
  send_method TEXT NOT NULL DEFAULT 'sms' CHECK (send_method IN ('sms','email','both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_settings_org ON review_settings
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
