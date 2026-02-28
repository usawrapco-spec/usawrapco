-- Add vehicle info and design preference fields to customer_intake
-- Used by onboarding/create, onboarding/[token], onboarding/submit routes
ALTER TABLE customer_intake
  ADD COLUMN IF NOT EXISTS vehicle_year text,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS vehicle_vin text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS wrap_style text,
  ADD COLUMN IF NOT EXISTS coverage text,
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS additional_notes text;
