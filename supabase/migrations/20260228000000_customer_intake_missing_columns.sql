-- Add missing columns to customer_intake that the intake portal form uses
ALTER TABLE customer_intake
  ADD COLUMN IF NOT EXISTS vehicle_trim             TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_condition        TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_condition_notes  TEXT,
  ADD COLUMN IF NOT EXISTS wrap_areas               JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS wrap_type                TEXT,
  ADD COLUMN IF NOT EXISTS has_existing_wrap        BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS existing_wrap_description TEXT,
  ADD COLUMN IF NOT EXISTS damage_photos            JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS branding_meta            JSONB    DEFAULT '{}';
