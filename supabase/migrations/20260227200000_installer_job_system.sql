-- Installer Job System: issues, material usage, mileage, GPS check-ins, notes
-- 20260227200000_installer_job_system.sql

-- ── installer_issues ──────────────────────────────────────────────────────────
create table if not exists installer_issues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  installer_id uuid not null references profiles(id),
  issue_type text not null, -- material_defect|design_error|vehicle_surface|customer_issue|wrong_materials|safety_concern|other
  urgency text not null default 'medium', -- low|medium|high|critical
  description text not null,
  photos jsonb default '[]'::jsonb,
  status text not null default 'open', -- open|in_progress|resolved
  resolution_notes text,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  manager_response text,
  manager_action text, -- resolve_remotely|send_help|coming_on_site
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── installer_material_usage ──────────────────────────────────────────────────
create table if not exists installer_material_usage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  installer_id uuid not null references profiles(id),
  vinyl_type text,
  vinyl_color text,
  vinyl_sku text,
  linear_feet_used numeric(10,2),
  sq_ft_used numeric(10,2),
  laminate_used boolean default false,
  laminate_sq_ft numeric(10,2),
  leftover_linear_ft numeric(10,2),
  leftover_sq_ft numeric(10,2),
  estimated_sq_ft numeric(10,2),
  waste_percentage numeric(6,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── installer_mileage_log ─────────────────────────────────────────────────────
create table if not exists installer_mileage_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  installer_id uuid not null references profiles(id),
  from_address text,
  to_address text,
  miles numeric(8,2),
  tracking_method text default 'manual', -- manual|gps
  trip_date date not null default current_date,
  notes text,
  reimbursement_amount numeric(10,2),
  reimbursement_status text default 'pending', -- pending|approved|paid
  created_at timestamptz not null default now()
);

-- ── installer_gps_checkins ────────────────────────────────────────────────────
create table if not exists installer_gps_checkins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  installer_id uuid not null references profiles(id),
  session_id uuid,
  event_type text not null, -- clock_in|clock_out|break_start|break_end
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy_meters numeric(8,2),
  distance_from_site_meters numeric(8,2),
  verified boolean default false,
  created_at timestamptz not null default now()
);

-- ── installer_notes ───────────────────────────────────────────────────────────
create table if not exists installer_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  installer_id uuid not null references profiles(id),
  note_text text not null,
  note_tag text default 'general', -- general|customer|designer|production_manager|next_installer
  photo_url text,
  is_voice boolean default false,
  created_at timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table installer_issues enable row level security;
alter table installer_material_usage enable row level security;
alter table installer_mileage_log enable row level security;
alter table installer_gps_checkins enable row level security;
alter table installer_notes enable row level security;

-- installer_issues policies
create policy "installer_issues_select" on installer_issues
  for select using (
    auth.uid() = installer_id or
    exists (select 1 from profiles where id = auth.uid() and org_id = installer_issues.org_id and role in ('owner','admin','production'))
  );
create policy "installer_issues_insert" on installer_issues
  for insert with check (auth.uid() = installer_id);
create policy "installer_issues_update" on installer_issues
  for update using (
    auth.uid() = installer_id or
    exists (select 1 from profiles where id = auth.uid() and org_id = installer_issues.org_id and role in ('owner','admin','production'))
  );

-- material usage policies
create policy "installer_material_usage_select" on installer_material_usage
  for select using (
    auth.uid() = installer_id or
    exists (select 1 from profiles where id = auth.uid() and org_id = installer_material_usage.org_id and role in ('owner','admin','production'))
  );
create policy "installer_material_usage_insert" on installer_material_usage
  for insert with check (auth.uid() = installer_id);
create policy "installer_material_usage_update" on installer_material_usage
  for update using (auth.uid() = installer_id);

-- mileage policies
create policy "installer_mileage_log_select" on installer_mileage_log
  for select using (
    auth.uid() = installer_id or
    exists (select 1 from profiles where id = auth.uid() and org_id = installer_mileage_log.org_id and role in ('owner','admin'))
  );
create policy "installer_mileage_log_insert" on installer_mileage_log
  for insert with check (auth.uid() = installer_id);
create policy "installer_mileage_log_update" on installer_mileage_log
  for update using (auth.uid() = installer_id);

-- gps checkins policies
create policy "installer_gps_checkins_select" on installer_gps_checkins
  for select using (
    auth.uid() = installer_id or
    exists (select 1 from profiles where id = auth.uid() and org_id = installer_gps_checkins.org_id and role in ('owner','admin','production'))
  );
create policy "installer_gps_checkins_insert" on installer_gps_checkins
  for insert with check (auth.uid() = installer_id);

-- notes policies
create policy "installer_notes_select" on installer_notes
  for select using (
    auth.uid() = installer_id or
    exists (select 1 from profiles where id = auth.uid() and org_id = installer_notes.org_id and role in ('owner','admin','production','designer','sales_agent'))
  );
create policy "installer_notes_insert" on installer_notes
  for insert with check (auth.uid() = installer_id);
create policy "installer_notes_update" on installer_notes
  for update using (auth.uid() = installer_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_installer_issues_project on installer_issues(project_id);
create index if not exists idx_installer_issues_installer on installer_issues(installer_id);
create index if not exists idx_installer_material_project on installer_material_usage(project_id);
create index if not exists idx_installer_mileage_installer on installer_mileage_log(installer_id);
create index if not exists idx_installer_gps_project on installer_gps_checkins(project_id);
create index if not exists idx_installer_notes_project on installer_notes(project_id);
