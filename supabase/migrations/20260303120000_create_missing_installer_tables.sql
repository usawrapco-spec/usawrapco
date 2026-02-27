-- installer_issues
CREATE TABLE IF NOT EXISTS installer_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id),
  issue_type text NOT NULL,
  urgency text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  photos text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE installer_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON installer_issues USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- installer_assignments
CREATE TABLE IF NOT EXISTS installer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE installer_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON installer_assignments USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- installer_gps_checkins
CREATE TABLE IF NOT EXISTS installer_gps_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id),
  session_id uuid,
  event_type text NOT NULL,
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_meters numeric(10,2),
  distance_from_site_meters numeric(10,2),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE installer_gps_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON installer_gps_checkins USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- installer_material_usage
CREATE TABLE IF NOT EXISTS installer_material_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id),
  vinyl_type text,
  vinyl_color text,
  vinyl_sku text,
  linear_feet_used numeric(10,2),
  sq_ft_used numeric(10,2),
  laminate_used boolean DEFAULT false,
  laminate_sq_ft numeric(10,2),
  leftover_linear_ft numeric(10,2),
  leftover_sq_ft numeric(10,2),
  estimated_sq_ft numeric(10,2),
  waste_percentage numeric(6,2),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE installer_material_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON installer_material_usage USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- installer_mileage_log
CREATE TABLE IF NOT EXISTS installer_mileage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id),
  from_address text,
  to_address text,
  miles numeric(10,2) NOT NULL,
  tracking_method text DEFAULT 'manual',
  trip_date date,
  notes text,
  reimbursement_amount numeric(10,2),
  reimbursement_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE installer_mileage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON installer_mileage_log USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- installer_notes
CREATE TABLE IF NOT EXISTS installer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  installer_id uuid REFERENCES profiles(id),
  note_text text NOT NULL,
  note_tag text DEFAULT 'general',
  photo_url text,
  is_voice boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE installer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON installer_notes USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- media_packs
CREATE TABLE IF NOT EXISTS media_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  media_file_ids uuid[] DEFAULT '{}',
  photo_urls text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE media_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON media_packs USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- message_templates
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'custom',
  content text NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON message_templates USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- presentation_views
CREATE TABLE IF NOT EXISTS presentation_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id uuid REFERENCES design_presentations(id) ON DELETE CASCADE,
  session_id text,
  viewer_name text,
  viewer_email text,
  ip_address text,
  user_agent text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  time_spent_seconds integer,
  slides_viewed jsonb DEFAULT '[]',
  decision text,
  feedback text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE presentation_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert" ON presentation_views FOR INSERT WITH CHECK (true);
CREATE POLICY "org_select" ON presentation_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM design_presentations dp JOIN design_projects dproj ON dp.design_project_id = dproj.id JOIN profiles p ON p.org_id = dproj.org_id WHERE dp.id = presentation_views.presentation_id AND p.id = auth.uid())
);

-- proof_annotations
CREATE TABLE IF NOT EXISTS proof_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid REFERENCES design_proofs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  author_name text,
  x_pct numeric(6,3),
  y_pct numeric(6,3),
  content text NOT NULL,
  layer text DEFAULT 'default',
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE proof_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON proof_annotations FOR SELECT USING (true);
CREATE POLICY "auth_insert" ON proof_annotations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
