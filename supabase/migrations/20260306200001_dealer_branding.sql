-- ─────────────────────────────────────────────────────────────────────────────
-- Dealer Branding — white-label support for dealer portals
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS primary_app text;
