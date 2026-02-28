-- Fleet tables RLS: replace monolithic ALL policies with 4 split policies
-- Matches project-wide pattern: SELECT/INSERT/UPDATE/DELETE, using get_my_org_id()

-- fleet_trips
DROP POLICY IF EXISTS "org_access" ON fleet_trips;

CREATE POLICY "fleet_trips_select" ON fleet_trips
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "fleet_trips_insert" ON fleet_trips
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "fleet_trips_update" ON fleet_trips
  FOR UPDATE USING (org_id = get_my_org_id())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "fleet_trips_delete" ON fleet_trips
  FOR DELETE USING (org_id = get_my_org_id());

-- fleet_vehicles
DROP POLICY IF EXISTS "org_access" ON fleet_vehicles;

CREATE POLICY "fleet_vehicles_select" ON fleet_vehicles
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "fleet_vehicles_insert" ON fleet_vehicles
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "fleet_vehicles_update" ON fleet_vehicles
  FOR UPDATE USING (org_id = get_my_org_id())
  WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "fleet_vehicles_delete" ON fleet_vehicles
  FOR DELETE USING (org_id = get_my_org_id());
