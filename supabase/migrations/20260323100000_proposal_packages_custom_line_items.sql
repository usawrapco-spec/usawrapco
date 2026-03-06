-- Add custom_line_items JSONB column to proposal_packages
-- Allows adding ad-hoc line items (name + price) directly in each proposal section
ALTER TABLE proposal_packages
  ADD COLUMN IF NOT EXISTS custom_line_items jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN proposal_packages.custom_line_items IS 'Array of {name, description, price} objects for ad-hoc line items added directly in the proposal builder';