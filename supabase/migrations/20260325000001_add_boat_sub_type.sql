-- Add boat_sub_type column to mockup_results
ALTER TABLE mockup_results
  ADD COLUMN IF NOT EXISTS boat_sub_type text;
