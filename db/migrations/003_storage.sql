-- ═══════════════════════════════════════════════════════════════════════════
--  Storage bucket policies for property-media
--  Assumes you've created a bucket named `property-media` (PUBLIC read)
--  in Storage → New bucket.
--  Files are stored under: {owner_user_id}/{property_id}/{filename}
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow authenticated users to upload/read/delete only under their own uid folder.
-- (Public read is granted at the bucket level.)

drop policy if exists "property-media owner insert" on storage.objects;
create policy "property-media owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "property-media owner update" on storage.objects;
create policy "property-media owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "property-media owner delete" on storage.objects;
create policy "property-media owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read is intentionally allowed via the bucket's public flag;
-- selective sharing at the app layer decides which URLs are exposed.
drop policy if exists "property-media public read" on storage.objects;
create policy "property-media public read" on storage.objects
  for select to public
  using (bucket_id = 'property-media');
