-- ============================================================
-- COMMUNICATIONS MODULE — WrapShop Pro
-- Run this in the Supabase SQL Editor
-- ============================================================

-- COMMUNICATIONS LOG
-- Every SMS, call, and email in/out lives here
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Direction + channel
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'call', 'email')),

  -- Content
  body TEXT,
  subject TEXT, -- email only

  -- Contact info
  to_number TEXT,
  from_number TEXT,
  to_email TEXT,
  from_email TEXT,

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),

  -- External service refs
  twilio_sid TEXT,
  resend_id TEXT,

  -- Call specific
  call_duration_seconds INT,
  call_recording_url TEXT,

  -- Staff who sent it
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON communications;
CREATE POLICY "org_access" ON communications
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE org_id = communications.org_id
    )
  );

-- Indexes for fast customer/project timeline lookups
CREATE INDEX IF NOT EXISTS idx_comms_customer ON communications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_project ON communications(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_org ON communications(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_direction ON communications(org_id, direction, created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- SMS TEMPLATES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'estimate', 'production', 'install', 'pickup', 'follow_up')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON sms_templates;
CREATE POLICY "org_access" ON sms_templates FOR ALL USING (true);

-- Seed default templates
INSERT INTO sms_templates (name, body, category) VALUES
  ('Estimate Ready',          'Hi {{customer_name}}, your estimate from USA Wrap Co is ready! View it here: {{estimate_link}}. Questions? Reply to this text.', 'estimate'),
  ('Job Started Production',  'Hi {{customer_name}}, great news! Your {{vehicle}} wrap has entered production. We will keep you updated. - USA Wrap Co', 'production'),
  ('Install Scheduled',       'Hi {{customer_name}}, your wrap install is scheduled. We will text you when it is complete. - USA Wrap Co', 'install'),
  ('Vehicle Ready for Pickup','Hi {{customer_name}}, your vehicle is DONE! Your {{vehicle}} wrap looks amazing. Come pick it up at your convenience. - USA Wrap Co', 'pickup'),
  ('Follow Up',               'Hi {{customer_name}}, just checking in from USA Wrap Co. How is the wrap holding up? Let us know if you need anything!', 'follow_up'),
  ('Appointment Reminder',    'Reminder from USA Wrap Co: Your appointment is tomorrow. Reply YES to confirm or call us to reschedule.', 'general')
ON CONFLICT DO NOTHING;
