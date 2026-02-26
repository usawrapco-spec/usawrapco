-- Wrap funnel session expansions: appointment booking + ref_code tracking

ALTER TABLE wrap_funnel_sessions
  ADD COLUMN IF NOT EXISTS booked_appointment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appointment_note       TEXT,
  ADD COLUMN IF NOT EXISTS ref_code               TEXT;

-- Index for ref tracking
CREATE INDEX IF NOT EXISTS idx_wrap_funnel_ref ON wrap_funnel_sessions(ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wrap_funnel_utm ON wrap_funnel_sessions(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wrap_funnel_converted ON wrap_funnel_sessions(converted_at) WHERE converted_at IS NOT NULL;
