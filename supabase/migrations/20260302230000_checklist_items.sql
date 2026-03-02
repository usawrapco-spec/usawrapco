-- Department sign-off checklist items
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  org_id uuid not null,
  stage text not null check (stage in ('dept_sales', 'dept_production', 'dept_install')),
  item_key text not null,
  completed boolean not null default false,
  completed_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stage, item_key)
);

alter table checklist_items enable row level security;

create policy "checklist_select" on checklist_items
  for select to authenticated using (true);

create policy "checklist_insert" on checklist_items
  for insert to authenticated with check (true);

create policy "checklist_update" on checklist_items
  for update to authenticated using (true) with check (true);

create policy "checklist_delete" on checklist_items
  for delete to authenticated using (true);

-- Index for fast project lookups
create index if not exists checklist_items_project_id_idx on checklist_items(project_id);
