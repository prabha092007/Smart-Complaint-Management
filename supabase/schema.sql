-- ============================================================
-- ResolveAI — full schema, RLS policies, and demo seed data
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Core tables ----------

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_available boolean default true
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  default_department_id uuid references departments(id)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('customer','agent','manager','admin')) not null default 'customer',
  department_id uuid references departments(id),
  created_at timestamptz default now()
);

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  customer_id uuid references profiles(id) not null,
  title text not null,
  description text not null,
  category_id uuid references categories(id),
  severity int check (severity between 1 and 5),
  customer_impact text check (customer_impact in ('Low','Medium','High')),
  priority_score int,
  priority_level text check (priority_level in ('Low','Medium','High','Critical')),
  priority_reasons jsonb,
  ai_confidence numeric,
  ai_explanation text,
  proof_urls text[] not null default '{}',
  assigned_department_id uuid references departments(id),
  assigned_agent_id uuid references profiles(id),
  status text check (status in
    ('NEW','ASSIGNED','IN_PROGRESS','WAITING_FOR_CUSTOMER','RESOLVED','REOPENED','ESCALATED','CLOSED')
  ) default 'NEW',
  sla_hours numeric,
  sla_deadline timestamptz,
  escalation_level int default 0,
  reopen_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz,
  reopened_at timestamptz
);

create table if not exists complaint_comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references complaints(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);

create table if not exists complaint_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references complaints(id) on delete cascade,
  event text not null,
  detail jsonb,
  created_at timestamptz default now()
);

create table if not exists escalations (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references complaints(id) on delete cascade,
  level int not null,
  reason text,
  created_at timestamptz default now(),
  unique (complaint_id, level)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  type text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_complaints_status on complaints(status);
create index if not exists idx_complaints_sla_deadline on complaints(sla_deadline);
create index if not exists idx_complaints_priority on complaints(priority_score desc);
create index if not exists idx_complaints_customer on complaints(customer_id);
create index if not exists idx_complaints_department on complaints(assigned_department_id);

-- ---------- Auto-create a profile row whenever someone signs up ----------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'customer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table complaints enable row level security;
alter table complaint_comments enable row level security;
alter table complaint_history enable row level security;
alter table notifications enable row level security;
alter table departments enable row level security;
alter table categories enable row level security;
alter table escalations enable row level security;

-- profiles: everyone can read profiles (needed for agent names etc.), only owner can update their own
create policy "profiles are readable by authenticated users" on profiles
  for select using (auth.role() = 'authenticated');
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);

-- helper: is the current user staff (agent/manager/admin)?
create or replace function is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('agent','manager','admin')
  );
$$ language sql stable security definer;

-- complaints: customers see only their own; staff see everything
create policy "customers see own complaints" on complaints
  for select using (customer_id = auth.uid() or is_staff());
create policy "customers can create own complaints" on complaints
  for insert with check (customer_id = auth.uid());
create policy "customers can update own open complaints" on complaints
  for update using (customer_id = auth.uid() or is_staff());

-- comments: visible to complaint owner + staff
create policy "comments visible to owner and staff" on complaint_comments
  for select using (
    is_staff() or exists (select 1 from complaints c where c.id = complaint_id and c.customer_id = auth.uid())
  );
create policy "comments insertable by owner and staff" on complaint_comments
  for insert with check (
    is_staff() or exists (select 1 from complaints c where c.id = complaint_id and c.customer_id = auth.uid())
  );

create policy "history visible to owner and staff" on complaint_history
  for select using (
    is_staff() or exists (select 1 from complaints c where c.id = complaint_id and c.customer_id = auth.uid())
  );
create policy "history insertable by staff and system" on complaint_history
  for insert with check (true);

create policy "notifications visible to owner" on notifications
  for select using (user_id = auth.uid());
create policy "notifications insertable by staff/system" on notifications
  for insert with check (true);
create policy "notifications updatable by owner" on notifications
  for update using (user_id = auth.uid());

-- reference data: readable by any signed-in user, writable only via SQL / service role
create policy "departments readable by authenticated" on departments
  for select to authenticated using (true);
create policy "categories readable by authenticated" on categories
  for select to authenticated using (true);

-- escalations: owner + staff can read; the client (as an authenticated user)
-- creates/upserts them via checkAndEscalate()
create policy "escalations visible to owner and staff" on escalations
  for select using (
    is_staff() or exists (select 1 from complaints c where c.id = complaint_id and c.customer_id = auth.uid())
  );
create policy "escalations insertable by authenticated" on escalations
  for insert to authenticated with check (true);
create policy "escalations updatable by authenticated" on escalations
  for update to authenticated using (true);

-- ---------- Seed reference data ----------
insert into departments (name) values
  ('Finance'), ('Logistics'), ('Tech Support'), ('Quality Assurance'),
  ('Customer Success'), ('General Support')
on conflict (name) do nothing;

insert into categories (name, default_department_id)
select 'Payment', id from departments where name = 'Finance'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Refund', id from departments where name = 'Finance'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Delivery', id from departments where name = 'Logistics'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Product', id from departments where name = 'Quality Assurance'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Technical', id from departments where name = 'Tech Support'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Account', id from departments where name = 'Customer Success'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Subscription', id from departments where name = 'Finance'
on conflict (name) do nothing;
insert into categories (name, default_department_id)
select 'Other', id from departments where name = 'General Support'
on conflict (name) do nothing;

-- ---------- Storage: complaint proof images ----------
-- Public read, JPEG/PNG only, 5 MB max per file. Customers upload 0-2 images
-- as proof when submitting a complaint; the public URLs land in complaints.proof_urls.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('complaint-proofs', 'complaint-proofs', true, 5242880, array['image/jpeg','image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "complaint proofs are publicly readable" on storage.objects;
create policy "complaint proofs are publicly readable" on storage.objects
  for select using (bucket_id = 'complaint-proofs');

drop policy if exists "users upload complaint proofs to own folder" on storage.objects;
create policy "users upload complaint proofs to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'complaint-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own complaint proofs" on storage.objects;
create policy "users update own complaint proofs" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'complaint-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own complaint proofs" on storage.objects;
create policy "users delete own complaint proofs" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'complaint-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- NOTE on demo users:
-- Supabase requires users to be created via auth (Dashboard ->
-- Authentication -> Add user, or the signup form in the app).
-- After creating demo accounts there, promote them to staff roles
-- by running, e.g.:
--   update profiles set role = 'admin' where id = '<user-uuid>';
--   update profiles set role = 'agent', department_id =
--     (select id from departments where name = 'Finance')
--     where id = '<user-uuid>';
-- See README.md "Demo credentials" section for the recommended
-- set of accounts to create.
-- ============================================================
