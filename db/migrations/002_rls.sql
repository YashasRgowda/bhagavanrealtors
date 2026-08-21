-- ═══════════════════════════════════════════════════════════════════════════
--  Row-Level Security policies
--  Rule: a signed-in user only sees & writes rows where owner_user_id = auth.uid()
--  Multi-user ready: each dealer has their own siloed data.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.properties        enable row level security;
alter table public.property_media    enable row level security;
alter table public.property_contacts enable row level security;
alter table public.deals             enable row level security;
alter table public.tenancy_history   enable row level security;
alter table public.share_events      enable row level security;

-- profiles: user sees & edits own profile
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Generic owner-scoped policies (applied per table)
do $$
declare
  t text;
  tables text[] := array['properties','property_media','property_contacts','deals','tenancy_history','share_events'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%s owner all" on public.%I;', t, t);
    execute format($p$
      create policy "%s owner all" on public.%I
        for all
        using (owner_user_id = auth.uid())
        with check (owner_user_id = auth.uid());
    $p$, t, t);
  end loop;
end $$;

-- Public share_events read-by-token is served through a service-role API route,
-- not RLS, so we don't need an anonymous select policy here.
