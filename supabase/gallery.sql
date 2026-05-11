create extension if not exists pgcrypto;

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  storage_path text not null,
  alt_text text,
  created_at timestamptz not null default now()
);

alter table public.gallery_images enable row level security;

drop policy if exists "Gallery images are publicly readable" on public.gallery_images;
create policy "Gallery images are publicly readable"
on public.gallery_images
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can insert gallery images" on public.gallery_images;
create policy "Authenticated users can insert gallery images"
on public.gallery_images
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can delete gallery images" on public.gallery_images;
create policy "Authenticated users can delete gallery images"
on public.gallery_images
for delete
to authenticated
using (true);

-- The Luna admin page writes with SUPABASE_SERVICE_ROLE_KEY from server actions.
-- Service role requests bypass RLS; these authenticated policies are only needed
-- if you later replace the passcode admin with Supabase Auth owner accounts.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gallery-images',
  'gallery-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Gallery images storage is publicly readable" on storage.objects;
create policy "Gallery images storage is publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'gallery-images');

drop policy if exists "Authenticated users can upload gallery images" on storage.objects;
create policy "Authenticated users can upload gallery images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery-images'
  and name like 'uploads/%'
);

drop policy if exists "Authenticated users can delete gallery images" on storage.objects;
create policy "Authenticated users can delete gallery images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery-images'
  and name like 'uploads/%'
);
