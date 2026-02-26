-- ai_recaps: cached V.I.N.Y.L. daily briefs (owner only)
CREATE TABLE IF NOT EXISTS ai_recaps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL,
  recap_text  TEXT        NOT NULL DEFAULT '',
  sections    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB      NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cached_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_recaps_org_cached
  ON ai_recaps(org_id, cached_until DESC);

ALTER TABLE ai_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_recaps_owner_only" ON ai_recaps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.org_id = ai_recaps.org_id
        AND profiles.role = 'owner'
    )
  );

-- ai_settings: training instructions (owner only, multiple rows per key)
CREATE TABLE IF NOT EXISTS ai_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL,
  key        TEXT        NOT NULL DEFAULT 'vinyl_instruction',
  value      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_settings_org_key
  ON ai_settings(org_id, key);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_settings_owner_only" ON ai_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.org_id = ai_settings.org_id
        AND profiles.role = 'owner'
    )
  );
