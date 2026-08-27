-- ═══════════════════════════════════════════════════════════════════════════
--  Buyer Requirement Register
--
--  Every broker carries a head full of buyers ("2BHK in Yelahanka under 50L").
--  This is that list, written down — and structured enough that a property can
--  be matched against it deterministically.
--
--  Design notes:
--    • An unset constraint means "no constraint", never "match nothing".
--      That is why every budget/area/bhk column is nullable.
--    • Array columns default to '{}' = "any". Empty is always the permissive
--      case, so a half-filled requirement widens rather than silently narrows.
--    • Area is stored as the dealer typed it (value + unit); the match engine
--      converts to sq.ft so a requirement in sq.ft still matches land in guntha.
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type requirement_status as enum ('active', 'fulfilled', 'dropped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type urgency_level as enum ('immediate', 'soon', 'exploring');
exception when duplicate_object then null; end $$;

create table if not exists public.requirements (
  id                uuid primary key default gen_random_uuid(),
  owner_user_id     uuid not null references auth.users(id) on delete cascade,

  -- ── Who wants it ──
  buyer_name        text not null,
  buyer_phone       text,
  buyer_alt_phone   text,
  source            source_type default 'walkin',
  notes             text,

  -- ── What they want ──
  transaction_type  transaction_type not null,
  categories        text[] not null default '{}',   -- empty = any category
  property_types    text[] not null default '{}',   -- empty = any type

  bhk_min           text,                            -- '1RK','1','2','3','4','5+'
  bhk_max           text,

  budget_min        bigint,                          -- rupees; monthly rent for rent deals
  budget_max        bigint,

  area_min          numeric,
  area_max          numeric,
  area_unit         text default 'sqft',

  localities        text[] not null default '{}',   -- empty = anywhere
  city              text,

  -- ── Lifecycle ──
  urgency           urgency_level default 'soon',
  status            requirement_status not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  closed_at         timestamptz
);

create index if not exists requirements_owner_idx  on public.requirements (owner_user_id);
create index if not exists requirements_status_idx on public.requirements (status);
create index if not exists requirements_txn_idx    on public.requirements (transaction_type);
create index if not exists requirements_created_idx on public.requirements (created_at desc);

-- Keep updated_at honest (trigger function already exists from 001_init).
drop trigger if exists requirements_touch on public.requirements;
create trigger requirements_touch before update on public.requirements
  for each row execute function public.touch_updated_at();

-- Stamp closed_at when a requirement leaves 'active'.
create or replace function public.set_requirement_closed_at() returns trigger as $$
begin
  if new.status <> 'active' and old.status is distinct from new.status then
    new.closed_at := now();
  elsif new.status = 'active' and old.status is distinct from new.status then
    new.closed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists requirements_set_closed on public.requirements;
create trigger requirements_set_closed before update of status on public.requirements
  for each row execute function public.set_requirement_closed_at();

-- ── RLS: same owner-scoped rule as every other table ──
alter table public.requirements enable row level security;

drop policy if exists "requirements owner select" on public.requirements;
create policy "requirements owner select" on public.requirements
  for select using (auth.uid() = owner_user_id);

drop policy if exists "requirements owner insert" on public.requirements;
create policy "requirements owner insert" on public.requirements
  for insert with check (auth.uid() = owner_user_id);

drop policy if exists "requirements owner update" on public.requirements;
create policy "requirements owner update" on public.requirements
  for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "requirements owner delete" on public.requirements;
create policy "requirements owner delete" on public.requirements
  for delete using (auth.uid() = owner_user_id);
