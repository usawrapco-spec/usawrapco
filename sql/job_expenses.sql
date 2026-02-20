-- Job Expenses: unexpected costs logged against a project
-- Billable expenses are added to the total sale; internal ones are absorbed by the shop.

create table if not exists public.job_expenses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  created_by  uuid not null references public.profiles(id),

  category    text not null default 'misc',   -- material | labor | subcontractor | equipment | travel | misc
  description text not null,
  amount      numeric(10,2) not null default 0,
  billable    boolean not null default true,
  receipt_url text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes
create index if not exists job_expenses_project_id_idx on public.job_expenses(project_id);
create index if not exists job_expenses_org_id_idx     on public.job_expenses(org_id);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_expenses_updated_at on public.job_expenses;
create trigger job_expenses_updated_at
  before update on public.job_expenses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.job_expenses enable row level security;

-- Org members can see expenses for their org
create policy "org members can view job expenses"
  on public.job_expenses for select
  using (
    org_id in (
      select org_id from public.profiles where id = auth.uid()
    )
  );

-- Org members can insert expenses
create policy "org members can insert job expenses"
  on public.job_expenses for insert
  with check (
    org_id in (
      select org_id from public.profiles where id = auth.uid()
    )
    and created_by = auth.uid()
  );

-- Only the creator or an admin can update
create policy "creator or admin can update job expenses"
  on public.job_expenses for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and org_id = job_expenses.org_id and role = 'admin'
    )
  );

-- Only the creator or an admin can delete
create policy "creator or admin can delete job expenses"
  on public.job_expenses for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and org_id = job_expenses.org_id and role = 'admin'
    )
  );
