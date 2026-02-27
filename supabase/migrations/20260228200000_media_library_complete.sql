-- Media Library: complete column additions + media_packs table

-- 1. Add missing columns to media_files
ALTER TABLE public.media_files
  ADD COLUMN IF NOT EXISTS category      TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS ai_description TEXT,
  ADD COLUMN IF NOT EXISTS color_tags    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS starred       BOOLEAN DEFAULT false;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_media_files_category ON public.media_files(category);

-- 2. media_packs table: curated collections of media_files for client sharing
CREATE TABLE IF NOT EXISTS public.media_packs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  media_file_ids   JSONB NOT NULL DEFAULT '[]',
  photo_urls       JSONB NOT NULL DEFAULT '[]',
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  view_count       INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_media_packs_org ON public.media_packs(org_id);
CREATE INDEX IF NOT EXISTS idx_media_packs_created_at ON public.media_packs(created_at DESC);

-- RLS
ALTER TABLE public.media_packs ENABLE ROW LEVEL SECURITY;

-- Public SELECT (pack ID is the security gate — UUID is unguessable)
CREATE POLICY "media_packs_public_select"
  ON public.media_packs FOR SELECT
  USING (true);

-- Only org members can create packs
CREATE POLICY "media_packs_org_insert"
  ON public.media_packs FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE org_id = media_packs.org_id
    )
  );

-- Only org members can update (increment view_count etc.)
CREATE POLICY "media_packs_org_update"
  ON public.media_packs FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE org_id = media_packs.org_id
    )
  );

-- Only org members can delete
CREATE POLICY "media_packs_org_delete"
  ON public.media_packs FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE org_id = media_packs.org_id
    )
  );
