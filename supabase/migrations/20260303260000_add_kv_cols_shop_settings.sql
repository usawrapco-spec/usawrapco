-- Add key-value store columns to shop_settings
-- CommissionsClient uses shop_settings as a key-value store for commission rates
-- These columns are NULL for the main shop-info row and populated for kv-setting rows
ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS key           text,
  ADD COLUMN IF NOT EXISTS value         text,
  ADD COLUMN IF NOT EXISTS category      text,
  ADD COLUMN IF NOT EXISTS is_sensitive  boolean DEFAULT false;
