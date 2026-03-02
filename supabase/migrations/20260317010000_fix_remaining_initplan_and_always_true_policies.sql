-- Fix remaining advisor issues: initplan on design_assets/storage_files,
-- always-true policy on system_alerts, redundant UPDATE on design_mockups

-- ============================================================
-- 1. design_assets — fix auth_rls_initplan
-- ============================================================
DROP POLICY IF EXISTS "org_access_design_assets" ON design_assets;

CREATE POLICY "org_access_design_assets"
  ON design_assets FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 2. storage_files — fix auth_rls_initplan
-- ============================================================
DROP POLICY IF EXISTS "org_access_storage_files" ON storage_files;

CREATE POLICY "org_access_storage_files"
  ON storage_files FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 3. system_alerts — no org_id; scope to authenticated role
--    so anon cannot read/write system alerts
-- ============================================================
DROP POLICY IF EXISTS "org members can manage system_alerts" ON system_alerts;

CREATE POLICY "authenticated users can manage system_alerts"
  ON system_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. design_mockups — drop redundant UPDATE policy
--    (covered by the ALL policy "org members can manage design_mockups")
-- ============================================================
DROP POLICY IF EXISTS "org_can_update_design_mockups" ON design_mockups;
