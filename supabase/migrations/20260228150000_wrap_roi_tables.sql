-- ROI Engine tables
-- wrap_campaigns, wrap_tracking_events, wrap_route_logs, wrap_roi_snapshots, wrap_leads

-- ─── wrap_campaigns ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_campaigns (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            UUID NOT NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  vehicle_label     TEXT NOT NULL,
  industry          TEXT,
  avg_ltv           NUMERIC DEFAULT 1050,
  install_date      DATE,
  investment_amount NUMERIC,
  tracking_phone    TEXT,
  forward_to        TEXT,
  qr_code_url       TEXT,
  qr_slug           TEXT UNIQUE,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  ai_insight        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── wrap_tracking_events ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_tracking_events (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id            UUID NOT NULL REFERENCES wrap_campaigns(id) ON DELETE CASCADE,
  org_id                 UUID NOT NULL,
  event_type             TEXT NOT NULL CHECK (event_type IN ('call', 'qr_scan', 'job_logged')),
  lat                    NUMERIC,
  lng                    NUMERIC,
  location_city          TEXT,
  location_state         TEXT,
  location_accuracy      TEXT DEFAULT 'unknown',
  caller_number          TEXT,
  call_duration_seconds  INTEGER,
  job_value              NUMERIC,
  job_notes              TEXT,
  job_confirmed          BOOLEAN DEFAULT FALSE,
  event_at               TIMESTAMPTZ DEFAULT NOW(),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─── wrap_route_logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_route_logs (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id             UUID NOT NULL REFERENCES wrap_campaigns(id) ON DELETE CASCADE,
  org_id                  UUID NOT NULL,
  route_name              TEXT,
  waypoints               JSONB DEFAULT '[]',
  drive_time_minutes      INTEGER,
  estimated_impressions   INTEGER,
  peak_hour_pct           INTEGER DEFAULT 40,
  ai_impression_estimate  INTEGER,
  ai_segment_breakdown    JSONB DEFAULT '[]',
  ai_suggestion           TEXT,
  route_date              DATE DEFAULT CURRENT_DATE,
  calls_that_day          INTEGER DEFAULT 0,
  scans_that_day          INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── wrap_roi_snapshots ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_roi_snapshots (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id    UUID NOT NULL REFERENCES wrap_campaigns(id) ON DELETE CASCADE,
  snapshot_date  DATE NOT NULL,
  total_calls    INTEGER DEFAULT 0,
  total_scans    INTEGER DEFAULT 0,
  total_jobs     INTEGER DEFAULT 0,
  total_revenue  NUMERIC DEFAULT 0,
  roi            NUMERIC DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── wrap_leads (public ROI calculator leads) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_leads (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                      UUID DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
  name                        TEXT NOT NULL,
  business_name               TEXT,
  phone                       TEXT,
  email                       TEXT,
  fleet_size                  INTEGER,
  notes                       TEXT,
  industry                    TEXT,
  num_vehicles                INTEGER,
  wrap_type                   TEXT,
  estimated_roi               NUMERIC,
  estimated_annual_impressions BIGINT,
  source                      TEXT DEFAULT 'roi-calculator',
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wrap_campaigns_org ON wrap_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_wrap_tracking_events_campaign ON wrap_tracking_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wrap_tracking_events_event_at ON wrap_tracking_events(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_wrap_route_logs_campaign ON wrap_route_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wrap_roi_snapshots_campaign ON wrap_roi_snapshots(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wrap_leads_created ON wrap_leads(created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE wrap_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_route_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_roi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrap_leads ENABLE ROW LEVEL SECURITY;

-- wrap_campaigns: org-scoped
CREATE POLICY "wrap_campaigns_org" ON wrap_campaigns
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- wrap_tracking_events: org-scoped
CREATE POLICY "wrap_tracking_events_org" ON wrap_tracking_events
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- wrap_route_logs: org-scoped
CREATE POLICY "wrap_route_logs_org" ON wrap_route_logs
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- wrap_roi_snapshots: org-scoped
CREATE POLICY "wrap_roi_snapshots_org" ON wrap_roi_snapshots
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- wrap_leads: public insert (anyone can submit a lead), org-scoped reads
CREATE POLICY "wrap_leads_public_insert" ON wrap_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "wrap_leads_org_read" ON wrap_leads
  FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
