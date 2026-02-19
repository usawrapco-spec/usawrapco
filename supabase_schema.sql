-- ============================================================
-- USA WRAP CO — Complete Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout
-- ============================================================


-- ─── ORGS ────────────────────────────────────────────────────
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'starter',
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  role        text not null default 'sales'
              check (role in ('admin','sales','production','installer','designer','customer')),
  name        text not null,
  email       text not null,
  phone       text,
  avatar_url  text,
  permissions jsonb not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_org_id_idx on profiles(org_id);
create index if not exists profiles_org_role_idx on profiles(org_id, role);

-- ─── PROJECTS ────────────────────────────────────────────────
create table if not exists projects (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  type              text not null default 'wrap'
                    check (type in ('wrap','decking','design','ppf')),
  title             text not null default '',
  status            text not null default 'estimate'
                    check (status in (
                      'estimate','active','in_production','install_scheduled',
                      'installed','qc','closing','closed','cancelled'
                    )),
  customer_id       uuid references profiles(id),
  agent_id          uuid references profiles(id),
  installer_id      uuid references profiles(id),
  current_step_id   uuid,
  priority          text not null default 'normal'
                    check (priority in ('low','normal','high','urgent')),
  vehicle_desc      text,
  install_date      date,
  due_date          date,
  revenue           numeric(10,2),
  profit            numeric(10,2),
  gpm               numeric(5,2),
  commission        numeric(10,2),
  division          text not null default 'wraps'
                    check (division in ('wraps','decking')),
  pipe_stage        text not null default 'sales_in',
  form_data         jsonb not null default '{}',
  fin_data          jsonb,
  actuals           jsonb not null default '{}',
  checkout          jsonb not null default '{}',
  installer_bid     jsonb,
  send_backs        jsonb not null default '[]',
  referral          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists projects_org_id_idx         on projects(org_id);
create index if not exists projects_org_status_idx     on projects(org_id, status);
create index if not exists projects_org_agent_idx      on projects(org_id, agent_id);
create index if not exists projects_org_installer_idx  on projects(org_id, installer_id);
create index if not exists projects_org_customer_idx   on projects(org_id, customer_id);
create index if not exists projects_install_date_idx   on projects(install_date);

-- ─── PROJECT MEMBERS (designer access) ───────────────────────
create table if not exists project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null default 'designer',
  granted_by  uuid references profiles(id),
  granted_at  timestamptz not null default now(),
  unique(project_id, user_id)
);
create index if not exists pm_user_idx    on project_members(user_id);
create index if not exists pm_project_idx on project_members(project_id);

-- ─── FILES ───────────────────────────────────────────────────
create table if not exists files (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  project_id          uuid not null references projects(id) on delete cascade,
  uploaded_by         uuid references profiles(id),
  bucket_path         text not null,
  file_name           text not null,
  file_type           text not null default 'photo'
                      check (file_type in ('photo','proof','pdf','export','reference','other')),
  mime_type           text,
  size_bytes          bigint,
  version             int not null default 1,
  parent_file_id      uuid references files(id),
  is_current          boolean not null default true,
  is_customer_visible boolean not null default false,
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now()
);
create index if not exists files_project_idx         on files(project_id, file_type);
create index if not exists files_project_current_idx on files(project_id, is_current) where is_current = true;

-- ─── ANNOTATIONS ─────────────────────────────────────────────
create table if not exists annotations (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  file_id         uuid not null references files(id) on delete cascade,
  created_by      uuid references profiles(id),
  annotation_json jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists annotations_file_idx on annotations(file_id);

-- ─── FEEDBACK ────────────────────────────────────────────────
create table if not exists feedback (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  created_by      uuid references profiles(id),
  message         text not null,
  related_file_id uuid references files(id),
  type            text not null default 'comment'
                  check (type in ('comment','revision_request','question','approval_note')),
  status          text not null default 'open'
                  check (status in ('open','resolved','dismissed')),
  resolved_by     uuid references profiles(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists feedback_project_idx on feedback(project_id);

-- ─── APPROVALS ───────────────────────────────────────────────
create table if not exists approvals (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  type         text not null check (type in ('proof','install','final','deposit','custom')),
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected','expired')),
  requested_by uuid references profiles(id),
  reviewed_by  uuid references profiles(id),
  notes        text,
  reviewed_at  timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists approvals_project_idx on approvals(project_id, type, status);

-- ─── TASKS ───────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  assigned_to uuid references profiles(id),
  created_by  uuid references profiles(id),
  title       text not null,
  description text,
  type        text not null default 'manual'
              check (type in ('manual','auto','ai_suggested','reminder')),
  status      text not null default 'open'
              check (status in ('open','in_progress','done','dismissed')),
  priority    text not null default 'normal'
              check (priority in ('urgent','high','normal','low')),
  due_at      timestamptz,
  done_at     timestamptz,
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on tasks(org_id, assigned_to, status);
create index if not exists tasks_project_idx  on tasks(project_id, status);

-- ─── TIME BLOCKS (installer time tracking) ───────────────────
create table if not exists time_blocks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  user_id     uuid not null references profiles(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists time_blocks_project_idx on time_blocks(project_id, user_id);

-- ─── INSTALLER BIDS ──────────────────────────────────────────
create table if not exists installer_groups (
  id      uuid primary key default gen_random_uuid(),
  org_id  uuid not null references orgs(id) on delete cascade,
  name    text not null,
  created_at timestamptz not null default now()
);

create table if not exists installer_group_members (
  group_id uuid not null references installer_groups(id) on delete cascade,
  user_id  uuid not null references profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

create table if not exists installer_bids (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  org_id          uuid not null references orgs(id) on delete cascade,
  created_by      uuid references profiles(id),
  target_rate     numeric(8,2) not null default 35,
  offered_rate    numeric(8,2) not null,
  passive_margin  numeric(8,2) generated always as (target_rate - offered_rate) stored,
  status          text not null default 'open'
                  check (status in ('open','accepted','declined','cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists installer_bid_recipients (
  bid_id  uuid not null references installer_bids(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (bid_id, user_id)
);

create table if not exists installer_bid_responses (
  bid_id       uuid not null references installer_bids(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  response     text not null check (response in ('accepted','declined')),
  responded_at timestamptz not null default now(),
  primary key (bid_id, user_id)
);

-- ─── SALES REFERRALS ─────────────────────────────────────────
create table if not exists sales_referrals (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs(id) on delete cascade,
  project_id        uuid not null references projects(id) on delete cascade,
  referring_user_id uuid not null references profiles(id),
  closing_user_id   uuid not null references profiles(id),
  split_pct         numeric(5,4) not null default 0.025,
  amount_computed   numeric(10,2) generated always as (0) stored, -- updated by trigger
  created_at        timestamptz not null default now()
);

-- ─── CUSTOMERS + LOYALTY ─────────────────────────────────────
create table if not exists customers (
  id              uuid primary key references profiles(id) on delete cascade,
  org_id          uuid not null references orgs(id) on delete cascade,
  lifetime_spend  numeric(12,2) not null default 0,
  jobs_completed  int not null default 0,
  tier            text not null default 'Bronze'
                  check (tier in ('Bronze','Silver','Gold','Platinum')),
  notes           text,
  updated_at      timestamptz not null default now()
);
create index if not exists customers_org_idx on customers(org_id);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  customer_id uuid references profiles(id),
  amount      numeric(10,2) not null,
  status      text not null default 'pending'
              check (status in ('pending','paid','refunded')),
  paid_at     timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─── CARD TEMPLATES (customizable Kanban cards) ──────────────
create table if not exists card_templates (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  template_name text not null default 'Default',
  fields_json   jsonb not null default '[
    {"key":"customer_name","label":"Client","visible":true,"order":1},
    {"key":"vehicle_desc","label":"Vehicle","visible":true,"order":2},
    {"key":"status","label":"Status","visible":true,"order":3},
    {"key":"install_date","label":"Install Date","visible":true,"order":4},
    {"key":"installer_name","label":"Installer","visible":true,"order":5},
    {"key":"revenue","label":"Revenue","visible":false,"order":6,"financial":true},
    {"key":"gpm","label":"GPM","visible":false,"order":7,"financial":true},
    {"key":"agent_name","label":"Agent","visible":true,"order":8}
  ]',
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  project_id   uuid references projects(id),
  type         text not null,
  payload_json jsonb not null default '{}',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists notif_unread_idx on notifications(user_id, read_at) where read_at is null;

-- ─── ACTIVITY LOG ────────────────────────────────────────────
create table if not exists activity_log (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  project_id   uuid references projects(id),
  actor_id     uuid references profiles(id),
  actor_type   text not null default 'user'
               check (actor_type in ('user','system','ai','webhook')),
  action_type  text not null,
  payload_json jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists activity_project_idx on activity_log(project_id, created_at desc);
create index if not exists activity_org_idx     on activity_log(org_id, created_at desc);

-- ─── INTEGRATIONS ────────────────────────────────────────────
create table if not exists integrations (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  project_id          uuid references projects(id) on delete cascade,
  ghl_contact_id      text,
  ghl_opportunity_id  text,
  slack_channel_id    text,
  slack_channel_name  text,
  last_synced_at      timestamptz,
  sync_errors         jsonb not null default '[]',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);


-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text;
begin
  foreach t in array array[
    'orgs','profiles','projects','tasks','installer_bids',
    'card_templates','integrations','customers'
  ] loop
    execute format(
      'drop trigger if exists trg_%I_updated_at on %I;
       create trigger trg_%I_updated_at
       before update on %I
       for each row execute function set_updated_at()',
      t,t,t,t
    );
  end loop;
end; $$;

-- Auto-log project stage changes
create or replace function log_project_stage_change()
returns trigger language plpgsql security definer as $$
begin
  if old.pipe_stage is distinct from new.pipe_stage or old.status is distinct from new.status then
    insert into activity_log(org_id, project_id, actor_type, action_type, payload_json)
    values (new.org_id, new.id, 'system', 'stage_changed', jsonb_build_object(
      'old_stage', old.pipe_stage, 'new_stage', new.pipe_stage,
      'old_status', old.status,   'new_status', new.status
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_stage_log on projects;
create trigger trg_project_stage_log
  after update on projects
  for each row execute function log_project_stage_change();

-- Auto-update loyalty tier on payment
create or replace function update_customer_loyalty()
returns trigger language plpgsql security definer as $$
declare v_customer customers%rowtype;
begin
  if new.status = 'paid' and new.customer_id is not null then
    update customers
      set lifetime_spend = lifetime_spend + new.amount,
          jobs_completed = jobs_completed + 1,
          tier = case
            when lifetime_spend + new.amount >= 50000 then 'Platinum'
            when lifetime_spend + new.amount >= 20000 then 'Gold'
            when lifetime_spend + new.amount >= 5000  then 'Silver'
            else 'Bronze'
          end
    where id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_loyalty on payments;
create trigger trg_payment_loyalty
  after insert or update on payments
  for each row execute function update_customer_loyalty();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table orgs            enable row level security;
alter table profiles        enable row level security;
alter table projects        enable row level security;
alter table project_members enable row level security;
alter table files           enable row level security;
alter table annotations     enable row level security;
alter table feedback        enable row level security;
alter table approvals       enable row level security;
alter table tasks           enable row level security;
alter table time_blocks     enable row level security;
alter table installer_bids  enable row level security;
alter table installer_bid_recipients enable row level security;
alter table installer_bid_responses  enable row level security;
alter table sales_referrals enable row level security;
alter table customers       enable row level security;
alter table payments        enable row level security;
alter table card_templates  enable row level security;
alter table notifications   enable row level security;
alter table activity_log    enable row level security;
alter table integrations    enable row level security;

-- Helper functions
create or replace function auth_org_id()
returns uuid language sql security definer stable as $$
  select org_id from profiles where id = auth.uid() limit 1;
$$;

create or replace function auth_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid() limit 1;
$$;

-- ─── DROP ALL OLD POLICIES FIRST (safe re-run) ────────────────
do $$ declare r record;
begin
  for r in select tablename, policyname from pg_policies
           where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end; $$;

-- ─── PROFILES ─────────────────────────────────────────────────
create policy "profiles_read_own_org" on profiles for select
  using (org_id = auth_org_id());

create policy "profiles_update_own" on profiles for update
  using (id = auth.uid() or auth_role() = 'admin');

create policy "profiles_insert_admin" on profiles for insert
  with check (auth_role() = 'admin');

-- ─── PROJECTS ─────────────────────────────────────────────────
-- Admin / sales / production: all org projects
create policy "projects_staff" on projects for all
  using (org_id = auth_org_id() and auth_role() in ('admin','sales','production'));

-- Installer: only their assigned projects
create policy "projects_installer" on projects for select
  using (org_id = auth_org_id() and auth_role() = 'installer' and installer_id = auth.uid());

create policy "projects_installer_update" on projects for update
  using (org_id = auth_org_id() and auth_role() = 'installer' and installer_id = auth.uid());

-- Customer: only their own project
create policy "projects_customer" on projects for select
  using (org_id = auth_org_id() and auth_role() = 'customer' and customer_id = auth.uid());

-- Designer: only assigned projects
create policy "projects_designer" on projects for select
  using (org_id = auth_org_id() and auth_role() = 'designer'
    and exists (
      select 1 from project_members pm
      where pm.project_id = projects.id and pm.user_id = auth.uid()
    ));

-- ─── FILES ────────────────────────────────────────────────────
create policy "files_staff" on files for all
  using (org_id = auth_org_id() and auth_role() in ('admin','sales','production'));

create policy "files_installer_read" on files for select
  using (auth_role() = 'installer'
    and exists (select 1 from projects p where p.id = project_id and p.installer_id = auth.uid()));

create policy "files_customer_read" on files for select
  using (auth_role() = 'customer' and is_customer_visible = true
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

create policy "files_customer_upload" on files for insert
  with check (auth_role() = 'customer' and file_type = 'reference'
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

create policy "files_designer" on files for select
  using (auth_role() = 'designer'
    and exists (select 1 from project_members pm where pm.project_id = files.project_id and pm.user_id = auth.uid()));

-- ─── ANNOTATIONS ──────────────────────────────────────────────
create policy "annotations_staff" on annotations for all
  using (auth_role() in ('admin','sales','production','designer'));

create policy "annotations_customer" on annotations for select
  using (auth_role() = 'customer'
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid())
    and exists (select 1 from files f where f.id = file_id and f.is_customer_visible = true));

create policy "annotations_customer_insert" on annotations for insert
  with check (auth_role() = 'customer' and created_by = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

-- ─── FEEDBACK ─────────────────────────────────────────────────
create policy "feedback_staff" on feedback for all
  using (auth_role() in ('admin','sales','production','designer'));

create policy "feedback_customer" on feedback for select
  using (auth_role() = 'customer'
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

create policy "feedback_customer_insert" on feedback for insert
  with check (auth_role() = 'customer' and created_by = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

-- ─── APPROVALS ────────────────────────────────────────────────
create policy "approvals_staff" on approvals for all
  using (auth_role() in ('admin','sales','production'));

create policy "approvals_customer_read" on approvals for select
  using (auth_role() = 'customer' and type in ('proof','final')
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

create policy "approvals_customer_update" on approvals for update
  using (auth_role() = 'customer' and status = 'pending'
    and exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid()));

-- ─── TASKS ────────────────────────────────────────────────────
create policy "tasks_staff" on tasks for all
  using (org_id = auth_org_id() and auth_role() in ('admin','sales','production'));

create policy "tasks_own" on tasks for select
  using (org_id = auth_org_id() and assigned_to = auth.uid());

create policy "tasks_own_update" on tasks for update
  using (org_id = auth_org_id() and assigned_to = auth.uid());

-- ─── TIME BLOCKS ──────────────────────────────────────────────
create policy "time_blocks_staff" on time_blocks for all
  using (org_id = auth_org_id() and auth_role() in ('admin','production'));

create policy "time_blocks_installer" on time_blocks for all
  using (org_id = auth_org_id() and auth_role() = 'installer' and user_id = auth.uid());

-- ─── INSTALLER BIDS ───────────────────────────────────────────
create policy "bids_staff" on installer_bids for all
  using (org_id = auth_org_id() and auth_role() in ('admin','production'));

create policy "bid_recipients_installer" on installer_bid_recipients for select
  using (user_id = auth.uid());

create policy "bid_responses_own" on installer_bid_responses for all
  using (user_id = auth.uid());

-- ─── SALES REFERRALS ──────────────────────────────────────────
create policy "referrals_admin" on sales_referrals for all
  using (org_id = auth_org_id() and auth_role() = 'admin');

create policy "referrals_sales_read" on sales_referrals for select
  using (org_id = auth_org_id() and auth_role() = 'sales'
    and (referring_user_id = auth.uid() or closing_user_id = auth.uid()));

-- ─── CUSTOMERS ────────────────────────────────────────────────
create policy "customers_admin" on customers for all
  using (org_id = auth_org_id() and auth_role() in ('admin','sales'));

create policy "customers_own" on customers for select
  using (id = auth.uid());

-- ─── PAYMENTS ─────────────────────────────────────────────────
create policy "payments_staff" on payments for all
  using (org_id = auth_org_id() and auth_role() in ('admin','sales'));

create policy "payments_customer_read" on payments for select
  using (auth_role() = 'customer' and customer_id = auth.uid());

-- ─── CARD TEMPLATES ───────────────────────────────────────────
create policy "card_templates_admin" on card_templates for all
  using (org_id = auth_org_id() and auth_role() = 'admin');

create policy "card_templates_read" on card_templates for select
  using (org_id = auth_org_id() and auth_role() in ('admin','sales','production'));

-- ─── NOTIFICATIONS ────────────────────────────────────────────
create policy "notif_own" on notifications for all
  using (org_id = auth_org_id() and user_id = auth.uid());

-- ─── ACTIVITY LOG ─────────────────────────────────────────────
create policy "activity_staff" on activity_log for select
  using (org_id = auth_org_id() and auth_role() in ('admin','sales','production'));

-- ─── INTEGRATIONS ─────────────────────────────────────────────
create policy "integrations_admin" on integrations for all
  using (org_id = auth_org_id() and auth_role() = 'admin');


-- ============================================================
-- SEED: Create your first org + admin user
-- After running this, update the user_id below with the real
-- auth.uid() of your first signed-up user.
-- ============================================================

insert into orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'USA Wrap Co', 'usawrapco')
  on conflict (slug) do nothing;

-- NOTE: After you sign up in Supabase Auth, run this to
-- create your admin profile. Replace the UUID with your user's ID.
--
-- insert into profiles (id, org_id, role, name, email) values
--   ('YOUR-AUTH-USER-UUID', '00000000-0000-0000-0000-000000000001',
--    'admin', 'Your Name', 'you@example.com');
