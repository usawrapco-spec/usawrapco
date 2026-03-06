-- Add line_item_ids and price_mode to proposal_packages
ALTER TABLE proposal_packages
  ADD COLUMN IF NOT EXISTS line_item_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_mode text NOT NULL DEFAULT 'manual';
