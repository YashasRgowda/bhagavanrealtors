-- ═══════════════════════════════════════════════════════════════════════════
--  ⚠️  DESTRUCTIVE — WIPES EVERY PROPERTY AND ALL RELATED RECORDS  ⚠️
--
--  Run in: Supabase → SQL Editor → New query → paste → Run.
--
--  BEFORE YOU RUN: confirm the project name in the top-left of the dashboard.
--  There is no undo. If you might want this data back, take a backup first
--  (Database → Backups, or `pg_dump`).
--
--  WHAT THIS DELETES
--    public.properties          ← the parent; everything below cascades from it
--      └ property_media         (DB rows only — see step 2 for the actual files)
--      └ property_contacts
--      └ deals
--      └ tenancy_history
--      └ share_events           (every share link stops working immediately)
--
--  WHAT THIS KEEPS
--    • Your auth user — you can still log in afterwards.
--    • Your public.profiles row (brand_name / brand_phone) — the app reads it
--      for branding on shared listings. Section 3 below can reset it if wanted.
--    • Tables, enums, triggers, indexes, RLS policies — schema is untouched,
--      so the app keeps working. You are emptying it, not tearing it down.
--
--  THIS DOES NOT DELETE THE PHOTOS AND VIDEOS THEMSELVES.
--  Those live in Supabase Storage. Do step 2 as well — see the file
--  db/scripts/wipe-storage.mjs, or the Storage UI instructions.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1. LOOK BEFORE YOU LEAP — run this on its own first.
--    It changes nothing; it just shows you what is about to be destroyed.
-- ─────────────────────────────────────────────────────────────────────────
select 'properties'        as table_name, count(*) from public.properties
union all select 'property_media',     count(*) from public.property_media
union all select 'property_contacts',  count(*) from public.property_contacts
union all select 'deals',              count(*) from public.deals
union all select 'tenancy_history',    count(*) from public.tenancy_history
union all select 'share_events',       count(*) from public.share_events;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. THE WIPE.
--    Deleting from `properties` cascades to all five child tables, because
--    each one declares `references public.properties(id) on delete cascade`.
--    Wrapped in a transaction so it is all-or-nothing.
-- ─────────────────────────────────────────────────────────────────────────
begin;

delete from public.properties;

-- Safety net: these should already be empty via cascade. If any row survives,
-- it means something references a property that no longer exists — clean it.
delete from public.property_media;
delete from public.property_contacts;
delete from public.deals;
delete from public.tenancy_history;
delete from public.share_events;

commit;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. OPTIONAL — also clear your brand details.
--    Skip this if you want to keep brand_name / brand_phone.
--    Do NOT `delete from public.profiles` — the row is only auto-created when
--    an auth user is first inserted, so deleting it will not come back on
--    next login, and shared listings lose their contact number.
-- ─────────────────────────────────────────────────────────────────────────
-- update public.profiles
--    set brand_name = null,
--        brand_phone = null,
--        full_name = null,
--        phone = null;


-- ─────────────────────────────────────────────────────────────────────────
-- 4. VERIFY — every count should now be 0.
-- ─────────────────────────────────────────────────────────────────────────
select 'properties'        as table_name, count(*) from public.properties
union all select 'property_media',     count(*) from public.property_media
union all select 'property_contacts',  count(*) from public.property_contacts
union all select 'deals',              count(*) from public.deals
union all select 'tenancy_history',    count(*) from public.tenancy_history
union all select 'share_events',       count(*) from public.share_events;
