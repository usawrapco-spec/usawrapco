-- Fix: shop_settings has org_id UNIQUE which only allows 1 row per org.
-- CommissionsClient needs multiple KV rows per org (one per setting key).
-- Drop the single-row constraint and add a composite unique on (org_id, key).
ALTER TABLE shop_settings DROP CONSTRAINT IF EXISTS shop_settings_org_id_key;
ALTER TABLE shop_settings ADD CONSTRAINT shop_settings_org_key_unique UNIQUE (org_id, key);
