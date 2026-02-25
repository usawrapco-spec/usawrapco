-- Add mobile install and weather alert fields to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_mobile_install boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS install_address text,
  ADD COLUMN IF NOT EXISTS install_lat numeric,
  ADD COLUMN IF NOT EXISTS install_lng numeric,
  ADD COLUMN IF NOT EXISTS weather_alerts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_weather_check timestamptz;
