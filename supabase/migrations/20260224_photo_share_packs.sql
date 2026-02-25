-- Share photo packs: shareable collections of job photos
CREATE TABLE IF NOT EXISTS share_photo_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  view_count INT NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_share_photo_packs_token ON share_photo_packs(token);
CREATE INDEX idx_share_photo_packs_project ON share_photo_packs(project_id);

-- RLS
ALTER TABLE share_photo_packs ENABLE ROW LEVEL SECURITY;

-- Public SELECT by token (token is the security gate)
CREATE POLICY "Anyone can view share packs by token"
  ON share_photo_packs FOR SELECT
  USING (true);

-- Org-based INSERT
CREATE POLICY "Org members can create share packs"
  ON share_photo_packs FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Org-based UPDATE
CREATE POLICY "Org members can update share packs"
  ON share_photo_packs FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Org-based DELETE
CREATE POLICY "Org members can delete share packs"
  ON share_photo_packs FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
