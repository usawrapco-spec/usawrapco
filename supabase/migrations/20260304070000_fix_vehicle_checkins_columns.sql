-- VehicleCheckinClient inserts these columns that were missing from vehicle_checkins
ALTER TABLE public.vehicle_checkins
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS general_notes text,
  ADD COLUMN IF NOT EXISTS vehicle_clean boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS damage_acknowledged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_signature_url text,
  ADD COLUMN IF NOT EXISTS customer_present boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
