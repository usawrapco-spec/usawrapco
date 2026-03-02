-- Fix advisor issues: RLS gaps, initplan performance, duplicate policies, missing FK indexes

-- ============================================================
-- 1. mockup_results — add missing RLS policies (CRITICAL)
-- ============================================================
CREATE POLICY "org members can view mockup results"
  ON mockup_results FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "org members can insert mockup results"
  ON mockup_results FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "org members can update mockup results"
  ON mockup_results FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 2. system_health — add missing RLS policies (CRITICAL)
-- ============================================================
CREATE POLICY "org members can view system health"
  ON system_health FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "org members can insert system health"
  ON system_health FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "org admins can update system health"
  ON system_health FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 3. vehicle_templates — drop + recreate with (SELECT auth.uid())
--    to fix auth_rls_initplan performance warnings
-- ============================================================
DROP POLICY IF EXISTS "org members can view vehicle templates" ON vehicle_templates;
DROP POLICY IF EXISTS "org admins can insert vehicle templates" ON vehicle_templates;
DROP POLICY IF EXISTS "org admins can update vehicle templates" ON vehicle_templates;
DROP POLICY IF EXISTS "org admins can delete vehicle templates" ON vehicle_templates;

CREATE POLICY "org members can view vehicle templates"
  ON vehicle_templates FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "org admins can insert vehicle templates"
  ON vehicle_templates FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org admins can update vehicle templates"
  ON vehicle_templates FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org admins can delete vehicle templates"
  ON vehicle_templates FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 4. Missing FK indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_customer_id
  ON customer_portal_sessions (customer_id);

CREATE INDEX IF NOT EXISTS idx_design_intakes_converted_customer_id
  ON design_intakes (converted_customer_id);

CREATE INDEX IF NOT EXISTS idx_design_intakes_converted_project_id
  ON design_intakes (converted_project_id);

CREATE INDEX IF NOT EXISTS idx_design_mockups_vehicle_db_id
  ON design_mockups (vehicle_db_id);

CREATE INDEX IF NOT EXISTS idx_design_projects_intake_id
  ON design_projects (intake_id);

CREATE INDEX IF NOT EXISTS idx_installer_bids_customer_id
  ON installer_bids (customer_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_applied_to_project_id
  ON loyalty_redemptions (applied_to_project_id);

CREATE INDEX IF NOT EXISTS idx_mockup_history_generated_by
  ON mockup_history (generated_by);

-- ============================================================
-- 5. design_mockups — drop hardcoded + duplicate policies
-- ============================================================
DROP POLICY IF EXISTS "org_access" ON design_mockups;
DROP POLICY IF EXISTS "public_insert" ON design_mockups;
DROP POLICY IF EXISTS "authenticated_can_create_design_mockup" ON design_mockups;
DROP POLICY IF EXISTS "public_update_own_mockup" ON design_mockups;

-- ============================================================
-- 6. design_intakes — drop hardcoded org UUID policy
-- ============================================================
DROP POLICY IF EXISTS "org_access" ON design_intakes;
