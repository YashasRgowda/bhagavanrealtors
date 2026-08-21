-- ═══════════════════════════════════════════════════════════════════════════
--  Wipe ONE property and everything hanging off it.
--  Use for a clean-slate test. Cascades to deals, media, contacts, tenancy,
--  share events. Does NOT touch storage files (delete those from the Storage UI
--  if you want a full clean).
--
--  1. Find the property id first:
--        select id, title, locality, status, created_at
--        from public.properties
--        order by created_at desc;
--
--  2. Paste that id below and run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Replace with the property id you want to remove:
delete from public.properties
where id = 'PASTE-PROPERTY-UUID-HERE';

-- Optional: to also purge storage files for that property, run in the Storage UI.
-- Path pattern in bucket `property-media`:  {your_user_id}/{property_id}/*
