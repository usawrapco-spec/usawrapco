-- Add portal_features JSONB column to dealers table for feature toggles
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS portal_features jsonb DEFAULT '{"pnw_navigator":true,"fleet_manager":true,"mockup_generator":true,"messaging":true,"earnings":true}'::jsonb;

-- Add portal_features JSONB column to affiliates table (for sales agents)
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS portal_features jsonb DEFAULT '{"pnw_navigator":true,"fleet_manager":true,"mockup_generator":true,"messaging":true,"earnings":true}'::jsonb;
