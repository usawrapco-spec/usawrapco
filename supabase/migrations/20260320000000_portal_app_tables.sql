-- Portal App Tables
-- Adds: portal_notifications, customer_fleet_vehicles, customer_fleet_trips,
--       catch_log, wrap_roi_events

-- ── portal_notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN (
                 'action_required','estimate_ready','proof_ready',
                 'invoice_ready','status_update','message','general')),
  title       TEXT NOT NULL,
  body        TEXT,
  action_url  TEXT,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;

-- Public portal reads (customer reads their own — gated by token in app logic)
CREATE POLICY "portal_notifications_select" ON portal_notifications
  FOR SELECT USING (true);

-- Only service role can insert/update (CRM triggers)
CREATE POLICY "portal_notifications_insert" ON portal_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "portal_notifications_update" ON portal_notifications
  FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_customer ON portal_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread  ON portal_notifications(customer_id, read) WHERE read = false;

-- ── customer_fleet_vehicles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_fleet_vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vin         TEXT,
  year        TEXT,
  make        TEXT,
  model       TEXT,
  trim        TEXT,
  body_class  TEXT,
  color       TEXT,
  engine      TEXT,
  fuel_type   TEXT,
  wrap_status TEXT DEFAULT 'none' CHECK (wrap_status IN ('none','quoted','scheduled','in_progress','wrapped')),
  photo_url   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_fleet_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_vehicles_select" ON customer_fleet_vehicles FOR SELECT USING (true);
CREATE POLICY "fleet_vehicles_insert" ON customer_fleet_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "fleet_vehicles_update" ON customer_fleet_vehicles FOR UPDATE USING (true);
CREATE POLICY "fleet_vehicles_delete" ON customer_fleet_vehicles FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_customer ON customer_fleet_vehicles(customer_id);

-- ── customer_fleet_trips ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_fleet_trips (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID REFERENCES customer_fleet_vehicles(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id) ON DELETE CASCADE,
  start_time       TIMESTAMPTZ,
  end_time         TIMESTAMPTZ,
  distance_miles   NUMERIC(10,2),
  duration_minutes INT,
  route_data       JSONB,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_fleet_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_trips_select" ON customer_fleet_trips FOR SELECT USING (true);
CREATE POLICY "fleet_trips_insert" ON customer_fleet_trips FOR INSERT WITH CHECK (true);
CREATE POLICY "fleet_trips_update" ON customer_fleet_trips FOR UPDATE USING (true);
CREATE POLICY "fleet_trips_delete" ON customer_fleet_trips FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_fleet_trips_vehicle  ON customer_fleet_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_trips_customer ON customer_fleet_trips(customer_id);

-- ── catch_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catch_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID REFERENCES customers(id) ON DELETE CASCADE,
  species        TEXT NOT NULL,
  weight_lbs     NUMERIC(6,2),
  length_inches  NUMERIC(6,2),
  latitude       NUMERIC(10,6),
  longitude      NUMERIC(10,6),
  spot_name      TEXT,
  photo_url      TEXT,
  bait_lure      TEXT,
  conditions     TEXT,
  notes          TEXT,
  caught_at      TIMESTAMPTZ DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE catch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catch_log_select" ON catch_log FOR SELECT USING (true);
CREATE POLICY "catch_log_insert" ON catch_log FOR INSERT WITH CHECK (true);
CREATE POLICY "catch_log_update" ON catch_log FOR UPDATE USING (true);
CREATE POLICY "catch_log_delete" ON catch_log FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_catch_log_customer ON catch_log(customer_id);

-- ── wrap_roi_events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrap_roi_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  vehicle_id     UUID REFERENCES customer_fleet_vehicles(id) ON DELETE SET NULL,
  event_type     TEXT NOT NULL CHECK (event_type IN ('call','qr_scan','lead','conversion')),
  source         TEXT,
  revenue_amount NUMERIC(10,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wrap_roi_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roi_events_select" ON wrap_roi_events FOR SELECT USING (true);
CREATE POLICY "roi_events_insert" ON wrap_roi_events FOR INSERT WITH CHECK (true);
CREATE POLICY "roi_events_update" ON wrap_roi_events FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_roi_events_customer ON wrap_roi_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_roi_events_vehicle  ON wrap_roi_events(vehicle_id);
