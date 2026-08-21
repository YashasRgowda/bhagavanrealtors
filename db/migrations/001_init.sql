-- ═══════════════════════════════════════════════════════════════════════════
--  Bhagvan Realtors Property Manager — initial schema
--  Run this in Supabase SQL Editor (Project → SQL → New Query → paste → Run)
--
--  Design notes:
--    • ONE properties table forever. Soft archive via `status` column.
--    • Hybrid schema: hot filter/sort fields as columns, the type-specific
--      long tail in `attributes` JSONB.
--    • Files live in Supabase Storage; only URLs stored in DB.
--    • RLS: multi-owner ready. Each user only sees their own rows.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────
do $$ begin
  create type transaction_type as enum ('sale', 'rent', 'lease');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_category as enum ('residential', 'commercial', 'land');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_status as enum (
    'available',      -- live on main page
    'negotiating',    -- buyer/tenant in discussion
    'token',          -- token/advance received (sale)
    'sold',           -- closed sale
    'rented',         -- closed rent
    'leased',         -- closed lease
    'parked',         -- rented/leased & currently occupied
    'withdrawn'       -- owner pulled it
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_type as enum ('walkin', 'agent_tip', 'online', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('owner', 'assistant');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: mirrors auth.users, holds role. Auto-created on signup.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  role         user_role not null default 'owner',
  brand_name   text,           -- shown on shared listings
  brand_phone  text,           -- shown as the ONLY contact on shares
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- properties: the one and only table
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id                 uuid primary key default gen_random_uuid(),
  owner_user_id      uuid not null references auth.users(id) on delete cascade,

  -- Deal shape
  transaction_type   transaction_type not null,
  category           property_category not null,
  property_type      text not null,             -- e.g. 'flat', 'villa', 'plot', 'shop'

  -- Listing
  title              text,
  description        text,

  -- Location
  city               text,
  locality           text,
  address_text       text,
  pincode            text,
  latitude           double precision,
  longitude          double precision,

  -- Money (kept flexible; store rupees as bigint to avoid float rounding)
  price              bigint,                    -- sale price OR monthly rent OR lease lump-sum
  price_unit         text,                      -- 'total', 'per_month', 'per_sqft'
  deposit            bigint,                    -- rent/lease deposit
  is_negotiable      boolean default true,

  -- Area
  area_value         numeric,
  area_unit          text,                      -- 'sqft','sqyd','sqm','acre','guntha','cent','ankanam'

  -- Residential quick filter
  bhk                text,                      -- '1RK','1','2','3','4','5+'

  -- State
  status             property_status not null default 'available',
  source             source_type default 'walkin',
  is_featured        boolean not null default false,

  -- Long tail
  attributes         jsonb not null default '{}'::jsonb,

  -- Timestamps
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  closed_at          timestamptz                 -- set when sold/rented/leased
);

create index if not exists properties_owner_idx      on public.properties (owner_user_id);
create index if not exists properties_status_idx     on public.properties (status);
create index if not exists properties_txn_idx        on public.properties (transaction_type);
create index if not exists properties_category_idx   on public.properties (category);
create index if not exists properties_locality_idx   on public.properties (locality);
create index if not exists properties_created_idx    on public.properties (created_at desc);
create index if not exists properties_attributes_idx on public.properties using gin (attributes);

-- ─────────────────────────────────────────────────────────────────────────
-- property_media: photos/videos. File in Storage; URL here.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.property_media (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  type          media_type not null,
  storage_path  text not null,                 -- path inside bucket
  url           text not null,                 -- public or signed URL
  thumb_url     text,                          -- small thumbnail for grid view
  width         int,
  height        int,
  bytes         bigint,
  sort_order    int not null default 0,
  is_cover      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists property_media_property_idx on public.property_media (property_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────
-- property_contacts: owner/source info — NEVER shared publicly
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.property_contacts (
  property_id   uuid primary key references public.properties(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner_name    text,
  owner_phone   text,
  owner_alt_phone text,
  relationship  text,                          -- 'owner','broker','power_of_attorney'
  brokerage_expected bigint,
  private_notes text,
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- deals: one active sale deal per property (multiple over time if it falls through)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.deals (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  deal_type       transaction_type not null,
  buyer_name      text,
  buyer_phone     text,
  agreed_amount   bigint,
  current_stage   text,                        -- 'buyer_found','token','agreement','docs','khata','loan','sale_deed','stamp_reg','register','mutation','possession','closed'
  steps           jsonb not null default '{}'::jsonb,
  brokerage_received bigint,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  closed_at       timestamptz
);
create index if not exists deals_property_idx on public.deals (property_id);
create index if not exists deals_active_idx on public.deals (owner_user_id, is_active);

-- ─────────────────────────────────────────────────────────────────────────
-- tenancy_history: every past tenant on a rent/lease property
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.tenancy_history (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties(id) on delete cascade,
  owner_user_id  uuid not null references auth.users(id) on delete cascade,
  tenant_name    text,
  tenant_phone   text,
  rent_amount    bigint,
  deposit        bigint,
  lease_amount   bigint,
  start_date     date,
  end_date       date,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists tenancy_property_idx on public.tenancy_history (property_id, start_date desc);

-- ─────────────────────────────────────────────────────────────────────────
-- share_events: every private share link with its filter payload
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.share_events (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties(id) on delete cascade,
  owner_user_id  uuid not null references auth.users(id) on delete cascade,
  token          text not null unique,
  preset         text,                          -- 'teaser','serious','full','custom'
  fields         jsonb not null default '{}'::jsonb,   -- which fields to expose
  media_ids      uuid[] not null default '{}',         -- which photos/videos
  hide_owner     boolean not null default true,
  hide_address   boolean not null default true,
  view_count     int not null default 0,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists share_token_idx on public.share_events (token);
create index if not exists share_property_idx on public.share_events (property_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists properties_touch on public.properties;
create trigger properties_touch before update on public.properties
  for each row execute function public.touch_updated_at();

drop trigger if exists deals_touch on public.deals;
create trigger deals_touch before update on public.deals
  for each row execute function public.touch_updated_at();

drop trigger if exists contacts_touch on public.property_contacts;
create trigger contacts_touch before update on public.property_contacts
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-create profile on signup
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-set closed_at when status flips to a terminal/parked state
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_closed_at() returns trigger as $$
begin
  if new.status in ('sold','rented','leased','parked','withdrawn')
     and (old.status is distinct from new.status) then
    new.closed_at := now();
  elsif new.status in ('available','negotiating','token')
     and (old.status is distinct from new.status) then
    new.closed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists properties_set_closed on public.properties;
create trigger properties_set_closed before update of status on public.properties
  for each row execute function public.set_closed_at();
