-- ============================================================
-- Migration: enable RLS on the last three public tables
-- Run ONCE in Supabase Dashboard -> SQL Editor -> New query
-- (safe to re-run)
--
-- Before this, `escalations`, `departments` and `categories` had RLS
-- disabled, meaning anyone with the anon key could read/insert/delete
-- rows directly through the API. This locks them down while keeping the
-- client-side escalation flow working.
-- ============================================================

alter table departments  enable row level security;
alter table categories   enable row level security;
alter table escalations  enable row level security;

-- Reference data: readable by any signed-in user, writable only via SQL / service role
drop policy if exists "departments readable by authenticated" on departments;
create policy "departments readable by authenticated" on departments
  for select to authenticated using (true);

drop policy if exists "categories readable by authenticated" on categories;
create policy "categories readable by authenticated" on categories
  for select to authenticated using (true);

-- Escalations: visible to the complaint owner + staff; the app (running as an
-- authenticated user) may create / upsert them via checkAndEscalate().
drop policy if exists "escalations visible to owner and staff" on escalations;
create policy "escalations visible to owner and staff" on escalations
  for select using (
    is_staff() or exists (
      select 1 from complaints c where c.id = complaint_id and c.customer_id = auth.uid()
    )
  );

drop policy if exists "escalations insertable by authenticated" on escalations;
create policy "escalations insertable by authenticated" on escalations
  for insert to authenticated with check (true);

drop policy if exists "escalations updatable by authenticated" on escalations;
create policy "escalations updatable by authenticated" on escalations
  for update to authenticated using (true);
