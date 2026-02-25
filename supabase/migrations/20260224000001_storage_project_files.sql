-- ============================================================
-- project-files storage bucket — RLS policies
-- Bucket is ALREADY CREATED (public: true)
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop if re-running
DROP POLICY IF EXISTS "project-files: public read"          ON storage.objects;
DROP POLICY IF EXISTS "project-files: anon upload"          ON storage.objects;
DROP POLICY IF EXISTS "project-files: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "project-files: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "project-files: authenticated delete" ON storage.objects;

-- 1. Public read — required for customer portals, intake pages, proof links
CREATE POLICY "project-files: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files');

-- 2. Anon upload — required for CustomerIntakePortal
--    (customers visit the intake form without being logged in)
CREATE POLICY "project-files: anon upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'project-files');

-- 3. Authenticated upload — all logged-in users (staff, installers, designers)
CREATE POLICY "project-files: authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- 4. Authenticated update (upsert support)
CREATE POLICY "project-files: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files');

-- 5. Authenticated delete
CREATE POLICY "project-files: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');
