-- ============================================================
-- Migration: proof images on complaints
-- Run ONCE in Supabase Dashboard -> SQL Editor -> New query
-- (safe to re-run — every statement is idempotent)
-- ============================================================

-- 1. Column to store the public URLs of a complaint's proof images (0-2 of them)
alter table complaints
  add column if not exists proof_urls text[] not null default '{}';

-- 2. Storage bucket for the images: public read, JPEG/PNG only, 5 MB max each
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('complaint-proofs', 'complaint-proofs', true, 5242880, array['image/jpeg','image/png'])
on conflict (id) do update
  set public              = excluded.public,
      file_size_limit     = excluded.file_size_limit,
      allowed_mime_types  = excluded.allowed_mime_types;

-- 3. Storage RLS: anyone can read (bucket is public), but a user may only
--    write/replace/delete objects inside a folder named after their own uid.
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
