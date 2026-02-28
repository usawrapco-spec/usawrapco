-- Fix SECURITY DEFINER views: set security_invoker so views respect caller's RLS
ALTER VIEW public.billing_pipeline_summary SET (security_invoker = on);
ALTER VIEW public.customer_all_photos SET (security_invoker = on);
ALTER VIEW public.invoice_summary_stats SET (security_invoker = on);

-- Enable RLS on fleet tables (created without it)
ALTER TABLE public.fleet_gps_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_mileage_logs ENABLE ROW LEVEL SECURITY;

-- fleet_gps_pings: org-scoped policies
CREATE POLICY fleet_gps_pings_select ON public.fleet_gps_pings
  FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY fleet_gps_pings_insert ON public.fleet_gps_pings
  FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY fleet_gps_pings_update ON public.fleet_gps_pings
  FOR UPDATE USING (org_id = get_my_org_id());
CREATE POLICY fleet_gps_pings_delete ON public.fleet_gps_pings
  FOR DELETE USING (org_id = get_my_org_id());

-- fleet_maintenance: org-scoped policies
CREATE POLICY fleet_maintenance_select ON public.fleet_maintenance
  FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY fleet_maintenance_insert ON public.fleet_maintenance
  FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY fleet_maintenance_update ON public.fleet_maintenance
  FOR UPDATE USING (org_id = get_my_org_id());
CREATE POLICY fleet_maintenance_delete ON public.fleet_maintenance
  FOR DELETE USING (org_id = get_my_org_id());

-- fleet_mileage_logs: org-scoped policies
CREATE POLICY fleet_mileage_logs_select ON public.fleet_mileage_logs
  FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY fleet_mileage_logs_insert ON public.fleet_mileage_logs
  FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY fleet_mileage_logs_update ON public.fleet_mileage_logs
  FOR UPDATE USING (org_id = get_my_org_id());
CREATE POLICY fleet_mileage_logs_delete ON public.fleet_mileage_logs
  FOR DELETE USING (org_id = get_my_org_id());
