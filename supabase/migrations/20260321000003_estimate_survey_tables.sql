-- ── ESTIMATE SURVEY TABLES ────────────────────────────────────────────────────
-- Vehicles surveyed during the estimate walk-around + photos per vehicle
-- ─────────────────────────────────────────────────────────────────────────────

-- Survey vehicles
create table if not exists estimate_survey_vehicles (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references orgs(id) on delete cascade,
  estimate_id     uuid        not null references estimates(id) on delete cascade,
  vin             text,
  vin_decoded     boolean     not null default false,
  vehicle_year    text,
  vehicle_make    text,
  vehicle_model   text,
  vehicle_trim    text,
  vehicle_color   text,
  vehicle_plate   text,
  design_notes    text,
  concern_notes   text,
  existing_graphics boolean   not null default false,
  surface_condition text,     -- 'good' | 'fair' | 'poor'
  sort_order      integer     not null default 0,
  surveyed_by     uuid        references profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_survey_vehicles_estimate on estimate_survey_vehicles(estimate_id);
create index if not exists idx_survey_vehicles_org     on estimate_survey_vehicles(org_id);

-- Survey photos (per vehicle)
create table if not exists estimate_survey_photos (
  id                uuid        primary key default gen_random_uuid(),
  org_id            uuid        not null references orgs(id) on delete cascade,
  estimate_id       uuid        not null references estimates(id) on delete cascade,
  survey_vehicle_id uuid        references estimate_survey_vehicles(id) on delete cascade,
  storage_path      text,
  public_url        text        not null,
  file_name         text,
  file_size_bytes   bigint,
  angle             text,       -- 'front'|'driver_side'|'passenger_side'|'rear'|'detail'|'existing_vinyl'
  category          text        not null default 'pre_install',  -- 'pre_install'|'concern'|'reference'
  caption           text,
  concern_type      text,       -- 'rust'|'dent'|'scratch'|'existing_vinyl'|'other'
  is_flagged        boolean     not null default false,

  -- Markup
  markup_url        text,       -- storage URL of the marked-up flat image
  markup_data       jsonb,      -- draw actions for re-rendering

  -- Line item assignment
  line_item_ids     text[]      not null default '{}',

  -- Shareable link (public, no-auth)
  share_token       uuid        not null default gen_random_uuid() unique,

  uploaded_by       uuid        references profiles(id),
  created_at        timestamptz not null default now()
);

create index if not exists idx_survey_photos_vehicle    on estimate_survey_photos(survey_vehicle_id);
create index if not exists idx_survey_photos_estimate   on estimate_survey_photos(estimate_id);
create index if not exists idx_survey_photos_org        on estimate_survey_photos(org_id);
create index if not exists idx_survey_photos_token      on estimate_survey_photos(share_token);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table estimate_survey_vehicles enable row level security;
alter table estimate_survey_photos    enable row level security;

-- Org members have full access to their own org's survey data
create policy "org_members_survey_vehicles" on estimate_survey_vehicles
  for all
  using (org_id = (select org_id from profiles where id = auth.uid()))
  with check (org_id = (select org_id from profiles where id = auth.uid()));

create policy "org_members_survey_photos" on estimate_survey_photos
  for all
  using (org_id = (select org_id from profiles where id = auth.uid()))
  with check (org_id = (select org_id from profiles where id = auth.uid()));

-- Public read of photos via share_token (unauthenticated — used by /photos/[token] page)
-- The API route fetches via service role so RLS is bypassed server-side.
-- This policy allows direct Supabase client reads from public pages.
create policy "public_read_survey_photos_by_token" on estimate_survey_photos
  for select
  using (true);
