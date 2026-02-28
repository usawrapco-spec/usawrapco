-- Fleet Live Map tables (created via Supabase MCP, mirrored here for git tracking)

CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id),
  year int, make text, model text,
  trim text, color text, vin text,
  body_class text, engine text, fuel_type text,
  drive_type text, wrap_status text,
  mileage int DEFAULT 0,
  notes text, added_by uuid, source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fleet tracking columns (added via alter)
ALTER TABLE fleet_vehicles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS plate text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS wrap_sqft int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrap_date date,
  ADD COLUMN IF NOT EXISTS wrap_description text,
  ADD COLUMN IF NOT EXISTS mockup_url text,
  ADD COLUMN IF NOT EXISTS fleet_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS today_miles int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed_mph int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_lat decimal(10,7),
  ADD COLUMN IF NOT EXISTS last_lng decimal(10,7),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS route_type text,
  ADD COLUMN IF NOT EXISTS next_service_date date,
  ADD COLUMN IF NOT EXISTS next_service_miles int,
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#00D4FF',
  ADD COLUMN IF NOT EXISTS vehicle_emoji text DEFAULT '🚐';

ALTER TABLE fleet_vehicles DROP CONSTRAINT IF EXISTS fleet_vehicles_fleet_status_check;
ALTER TABLE fleet_vehicles ADD CONSTRAINT fleet_vehicles_fleet_status_check
  CHECK (fleet_status IN ('active','parked','maintenance','inactive','moving'));

CREATE TABLE IF NOT EXISTS fleet_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id),
  trip_date date DEFAULT CURRENT_DATE,
  from_location text,
  to_location text,
  distance_miles decimal(8,2) DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  logged_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_mileage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  miles decimal(8,2) NOT NULL,
  odometer_reading int,
  purpose text,
  logged_by uuid REFERENCES profiles(id),
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id),
  item_name text NOT NULL,
  due_date date,
  due_miles int,
  completed_date date,
  cost decimal(8,2),
  notes text,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming','due','overdue','completed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_gps_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES orgs(id),
  lat decimal(10,7) NOT NULL,
  lng decimal(10,7) NOT NULL,
  speed_mph int DEFAULT 0,
  heading int DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

-- Add missing trip columns
ALTER TABLE fleet_trips
  ADD COLUMN IF NOT EXISTS from_location text,
  ADD COLUMN IF NOT EXISTS to_location text,
  ADD COLUMN IF NOT EXISTS distance_miles decimal(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trip_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS logged_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;
