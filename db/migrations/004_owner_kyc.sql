-- ═══════════════════════════════════════════════════════════════════════════
--  Extend property_contacts with the optional KYC fields the dealer may
--  already have at listing time. Anything filled here prefills the deal's
--  seller_info stage so the dealer doesn't re-type it every deal.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.property_contacts
  add column if not exists owner_father    text,
  add column if not exists owner_pan       text,
  add column if not exists owner_aadhaar   text,
  add column if not exists is_nri          boolean default false,
  add column if not exists nri_country     text,
  add column if not exists bank_name       text,
  add column if not exists bank_account    text,
  add column if not exists bank_ifsc       text,
  add column if not exists has_coowner     boolean default false,
  add column if not exists coowner_name    text,
  add column if not exists coowner_relation text,
  add column if not exists coowner_pan     text,
  add column if not exists coowner_aadhaar text;
