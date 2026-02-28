-- ── Fix auth_rls_initplan: replace bare auth.uid() with get_my_org_id() ────────

-- estimate_options
DROP POLICY IF EXISTS "org members access estimate_options" ON public.estimate_options;
CREATE POLICY "org members access estimate_options" ON public.estimate_options
  USING (org_id = get_my_org_id());

-- estimate_templates
DROP POLICY IF EXISTS "org members access estimate_templates" ON public.estimate_templates;
CREATE POLICY "org members access estimate_templates" ON public.estimate_templates
  USING (org_id = get_my_org_id());

-- material_remnants
DROP POLICY IF EXISTS "org_access_material_remnants" ON public.material_remnants;
CREATE POLICY "org_access_material_remnants" ON public.material_remnants
  USING (org_id = get_my_org_id());

-- financing_applications
DROP POLICY IF EXISTS "org members can view financing apps" ON public.financing_applications;
CREATE POLICY "org members can view financing apps" ON public.financing_applications
  FOR SELECT USING (org_id = get_my_org_id());

DROP POLICY IF EXISTS "org members can insert financing apps" ON public.financing_applications;
CREATE POLICY "org members can insert financing apps" ON public.financing_applications
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

DROP POLICY IF EXISTS "org members can update financing apps" ON public.financing_applications;
CREATE POLICY "org members can update financing apps" ON public.financing_applications
  FOR UPDATE USING (org_id = get_my_org_id());

-- proof_annotations
DROP POLICY IF EXISTS "auth_insert" ON public.proof_annotations;
CREATE POLICY "auth_insert" ON public.proof_annotations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ── Add indexes for unindexed foreign keys ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_design_projects_created_by ON public.design_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_design_projects_designer_id ON public.design_projects(designer_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_project_id ON public.design_projects(project_id);

CREATE INDEX IF NOT EXISTS idx_estimate_options_estimate_id ON public.estimate_options(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_options_org_id ON public.estimate_options(org_id);

CREATE INDEX IF NOT EXISTS idx_estimate_templates_created_by ON public.estimate_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimate_templates_org_id ON public.estimate_templates(org_id);

CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON public.estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_production_manager_id ON public.estimates(production_manager_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON public.estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_manager_id ON public.estimates(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_estimates_sales_rep_id ON public.estimates(sales_rep_id);

CREATE INDEX IF NOT EXISTS idx_financing_applications_created_by ON public.financing_applications(created_by);
CREATE INDEX IF NOT EXISTS idx_financing_applications_org_id ON public.financing_applications(org_id);
CREATE INDEX IF NOT EXISTS idx_financing_applications_project_id ON public.financing_applications(project_id);

CREATE INDEX IF NOT EXISTS idx_fishing_reports_user_id ON public.fishing_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_pings_org_id ON public.fleet_gps_pings(org_id);
CREATE INDEX IF NOT EXISTS idx_fleet_gps_pings_vehicle_id ON public.fleet_gps_pings(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_org_id ON public.fleet_maintenance(org_id);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_vehicle_id ON public.fleet_maintenance(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_fleet_mileage_logs_logged_by ON public.fleet_mileage_logs(logged_by);
CREATE INDEX IF NOT EXISTS idx_fleet_mileage_logs_org_id ON public.fleet_mileage_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_fleet_mileage_logs_vehicle_id ON public.fleet_mileage_logs(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_fleet_trips_logged_by ON public.fleet_trips(logged_by);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_project_id ON public.fleet_vehicles(project_id);

CREATE INDEX IF NOT EXISTS idx_invoices_financing_application_id ON public.invoices(financing_application_id);

CREATE INDEX IF NOT EXISTS idx_material_remnants_from_roll_id ON public.material_remnants(from_roll_id);
CREATE INDEX IF NOT EXISTS idx_material_remnants_org_id ON public.material_remnants(org_id);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_finalized_by ON public.payroll_periods(finalized_by);

CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON public.sales_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_orders_designer_id ON public.sales_orders(designer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_production_manager_id ON public.sales_orders(production_manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_project_manager_id ON public.sales_orders(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_rep_id ON public.sales_orders(sales_rep_id);
