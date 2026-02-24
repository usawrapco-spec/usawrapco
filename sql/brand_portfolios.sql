-- Brand Portfolios — auto-generated branding documents per customer
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS brand_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  customer_id uuid,
  project_id uuid,
  company_name text,
  website_url text,
  logo_url text,
  logo_storage_path text,
  brand_colors jsonb DEFAULT '[]',    -- [{hex, name, usage}]
  typography jsonb DEFAULT '{}',      -- {primary_font, secondary_font}
  tagline text,
  phone text,
  email text,
  address text,
  services text[],
  social_links jsonb DEFAULT '{}',    -- {instagram, facebook, linkedin, etc}
  about_text text,
  scraped_images jsonb DEFAULT '[]',  -- images found on their site
  ai_brand_analysis text,             -- Claude's brand analysis JSON
  ai_recommendations text,            -- Claude's improvement suggestions
  logo_variations jsonb DEFAULT '[]', -- generated logo color variations
  status text DEFAULT 'draft',        -- draft/sent/viewed/approved
  customer_edits jsonb DEFAULT '{}',  -- what customer changed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON brand_portfolios;
CREATE POLICY "org_access" ON brand_portfolios
  FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Public read (for /brand/[portfolioId] public page)
DROP POLICY IF EXISTS "public_read" ON brand_portfolios;
CREATE POLICY "public_read" ON brand_portfolios
  FOR SELECT USING (status IN ('sent', 'viewed', 'approved'));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS brand_portfolios_customer_idx ON brand_portfolios (customer_id);
CREATE INDEX IF NOT EXISTS brand_portfolios_project_idx ON brand_portfolios (project_id);
CREATE INDEX IF NOT EXISTS brand_portfolios_org_idx ON brand_portfolios (org_id);
