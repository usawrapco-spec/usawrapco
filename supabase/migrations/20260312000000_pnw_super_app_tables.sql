-- ═══════════════════════════════════════════════════════════════════════════════
-- PNW NAVIGATOR SUPER-APP — CORE TABLES
-- Migration: 20260312000000
-- Tables: pnw_trips, pnw_catches, pnw_posts, pnw_post_likes,
--         pnw_alerts, pnw_wildlife, pnw_heritage_comments
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── GPS Trip Records ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_code text NOT NULL,
  name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  route_geojson jsonb,
  distance_nm numeric(10,3) DEFAULT 0,
  duration_seconds int DEFAULT 0,
  max_speed_knots numeric(6,2) DEFAULT 0,
  catches_count int DEFAULT 0,
  notes text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pnw_trips_user_id ON pnw_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_pnw_trips_started_at ON pnw_trips(started_at DESC);

ALTER TABLE pnw_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_trips_public_read" ON pnw_trips
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "pnw_trips_owner_all" ON pnw_trips
  FOR ALL USING (auth.uid() = user_id);

-- ── Catch Log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_catches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES pnw_trips(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  species text NOT NULL,
  weight_lbs numeric(8,2),
  length_inches numeric(6,2),
  method text,
  lat numeric(10,6),
  lng numeric(10,6),
  location_name text,
  kept boolean DEFAULT true,
  notes text,
  photo_url text,
  caught_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pnw_catches_user_id ON pnw_catches(user_id);
CREATE INDEX IF NOT EXISTS idx_pnw_catches_trip_id ON pnw_catches(trip_id);
CREATE INDEX IF NOT EXISTS idx_pnw_catches_caught_at ON pnw_catches(caught_at DESC);

ALTER TABLE pnw_catches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_catches_read_all" ON pnw_catches
  FOR SELECT USING (true);

CREATE POLICY "pnw_catches_owner_all" ON pnw_catches
  FOR ALL USING (auth.uid() = user_id);

-- ── Community Posts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT 'Boater',
  post_type text NOT NULL CHECK (post_type IN ('trip','catch','sighting','condition','heritage')),
  title text NOT NULL,
  body text NOT NULL,
  location_name text,
  lat numeric(10,6),
  lng numeric(10,6),
  species text,
  weight_lbs numeric(8,2),
  photo_url text,
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pnw_posts_user_id ON pnw_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_pnw_posts_post_type ON pnw_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_pnw_posts_created_at ON pnw_posts(created_at DESC);

ALTER TABLE pnw_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_posts_public_read" ON pnw_posts
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "pnw_posts_owner_all" ON pnw_posts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "pnw_posts_anon_insert" ON pnw_posts
  FOR INSERT WITH CHECK (true);

-- ── Post Reactions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES pnw_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pnw_post_likes_post_id ON pnw_post_likes(post_id);

ALTER TABLE pnw_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_post_likes_read_all" ON pnw_post_likes
  FOR SELECT USING (true);

CREATE POLICY "pnw_post_likes_owner_all" ON pnw_post_likes
  FOR ALL USING (auth.uid() = user_id);

-- ── NOAA/NWS Alert Cache ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id text UNIQUE NOT NULL,
  source text NOT NULL DEFAULT 'NOAA',
  alert_type text NOT NULL,
  headline text,
  description text,
  severity text,
  effective timestamptz,
  expires timestamptz,
  area text,
  is_active boolean NOT NULL DEFAULT true,
  raw_data jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pnw_alerts_is_active ON pnw_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pnw_alerts_expires ON pnw_alerts(expires);

ALTER TABLE pnw_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_alerts_public_read" ON pnw_alerts
  FOR SELECT USING (true);

CREATE POLICY "pnw_alerts_service_write" ON pnw_alerts
  FOR ALL USING (true);

-- ── Wildlife Sightings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_wildlife (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  species text NOT NULL,
  count int DEFAULT 1,
  lat numeric(10,6) NOT NULL,
  lng numeric(10,6) NOT NULL,
  location_name text,
  notes text,
  photo_url text,
  sighted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pnw_wildlife_sighted_at ON pnw_wildlife(sighted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pnw_wildlife_species ON pnw_wildlife(species);

ALTER TABLE pnw_wildlife ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_wildlife_read_all" ON pnw_wildlife
  FOR SELECT USING (true);

CREATE POLICY "pnw_wildlife_insert_all" ON pnw_wildlife
  FOR INSERT WITH CHECK (true);

-- ── Heritage Comments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pnw_heritage_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT 'PNW Boater',
  body text NOT NULL,
  likes_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pnw_heritage_comments_chapter ON pnw_heritage_comments(chapter_id);

ALTER TABLE pnw_heritage_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnw_heritage_comments_read_all" ON pnw_heritage_comments
  FOR SELECT USING (true);

CREATE POLICY "pnw_heritage_comments_insert_all" ON pnw_heritage_comments
  FOR INSERT WITH CHECK (true);
