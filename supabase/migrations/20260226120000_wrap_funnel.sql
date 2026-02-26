-- Wrap funnel sessions: tracks the Wrapmate-style public lead funnel
-- Each anonymous visitor gets a session_token stored in localStorage
-- Steps: 1=vehicle, 2=brand, 3=mockup gen, 4=signup gate, 5=portal

CREATE TABLE IF NOT EXISTS wrap_funnel_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL DEFAULT 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'::uuid,
  session_token    TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(20), 'hex'),

  -- Step 1: Vehicle
  vehicle_year     INT,
  vehicle_make     TEXT,
  vehicle_model    TEXT,
  vehicle_trim     TEXT,
  wrap_coverage    TEXT CHECK (wrap_coverage IN ('decal','quarter','half','full')),
  estimated_price_low  INT,
  estimated_price_high INT,

  -- Step 2: Brand
  website_url      TEXT,
  logo_url         TEXT,
  brand_colors     JSONB DEFAULT '[]'::jsonb,
  style_preference TEXT,
  instagram_handle TEXT,
  business_description TEXT,

  -- Step 3: Mockup generation
  mockup_prompts   JSONB DEFAULT '[]'::jsonb,
  prediction_ids   JSONB DEFAULT '[]'::jsonb,
  mockup_urls      JSONB DEFAULT '[]'::jsonb,

  -- Step 4: Lead signup
  contact_name     TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  business_name    TEXT,

  -- CRM refs (set after complete)
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  converted_at     TIMESTAMPTZ,

  -- Meta
  step_reached     INT DEFAULT 1,
  lead_source      TEXT DEFAULT 'Website Intake',
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  ip_address       TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: public can insert/update their own session by token; only service role can read all
ALTER TABLE wrap_funnel_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_funnel" ON wrap_funnel_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_funnel_by_token" ON wrap_funnel_sessions
  FOR UPDATE USING (true);

CREATE POLICY "public_select_funnel_by_token" ON wrap_funnel_sessions
  FOR SELECT USING (true);

-- Index for quick token lookups
CREATE INDEX IF NOT EXISTS idx_wrap_funnel_token ON wrap_funnel_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_wrap_funnel_email ON wrap_funnel_sessions(contact_email) WHERE contact_email IS NOT NULL;
