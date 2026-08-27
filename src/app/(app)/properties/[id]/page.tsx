import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { STATUS_META, PROPERTY_TYPES } from "@/lib/property/enums";
import { formatINRShort } from "@/lib/format/currency";
import { formatPhoneIN } from "@/lib/format/phone";
import { locationDetail } from "@/lib/property/attributes";
import { StatusChanger } from "@/components/property/StatusChanger";
import { PropertyActions } from "@/components/property/PropertyActions";
import { PropertySpecs } from "@/components/property/PropertySpecs";
import { PropertyDangerZone } from "@/components/property/PropertyDangerZone";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { TenancyList } from "@/components/property/TenancyList";
import { DealSummaryCard } from "@/components/deal/DealSummaryCard";
import { SharesList } from "@/components/share/SharesList";
import { BuyerMatches } from "@/components/property/BuyerMatches";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";
import type { DealRow } from "@/lib/deal/types";
import type { RequirementRow } from "@/lib/requirement/types";
import { ArrowLeft, MapPin, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: p } = await supabase.from("properties").select("*").eq("id", id).single();
  if (!p) notFound();
  const prop = p as PropertyRow;

  const { data: media = [] } = await supabase
    .from("property_media").select("*").eq("property_id", id).order("sort_order");
  const { data: contact } = await supabase
    .from("property_contacts").select("*").eq("property_id", id).maybeSingle();
  // Only show the "Active sale deal" card if the property is still live and has an active deal.
  const isLiveSale = prop.transaction_type === "sale" && !["sold", "withdrawn"].includes(prop.status);
  const { data: dealRow } = isLiveSale
    ? await supabase.from("deals").select("*").eq("property_id", id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const activeDeal = dealRow as DealRow | null;
  const { data: tenancy = [] } = prop.transaction_type !== "sale"
    ? await supabase.from("tenancy_history").select("*").eq("property_id", id)
        .order("start_date", { ascending: false })
    : { data: [] };
  const { data: shares = [] } = await supabase
    .from("share_events")
    .select("id, token, preset, hide_owner, hide_address, view_count, expires_at, revoked_at, created_at")
    .eq("property_id", id)
    .order("created_at", { ascending: false });
  // Active buyer requirements, matched against this property in the panel below.
  const { data: reqRows = [] } = await supabase
    .from("requirements").select("*").eq("status", "active");
  const requirements = (reqRows ?? []) as RequirementRow[];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Brand identity for the poster generator — same fields the share page uses.
  const { data: { user: me } } = await supabase.auth.getUser();
  const { data: profile } = me
    ? await supabase.from("profiles").select("brand_name, brand_phone, full_name, phone").eq("id", me.id).maybeSingle()
    : { data: null };
  const brandName = profile?.brand_name || profile?.full_name || "Bhagvan Realtors";
  const brandPhone = profile?.brand_phone || profile?.phone || null;

  const meta = STATUS_META[prop.status];
  const typeLabel = (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
    .find(t => t.value === prop.property_type)?.label ?? prop.property_type;

  const gallery = (media ?? []) as PropertyMediaRow[];
  const title = prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`;
  const where = [prop.locality, prop.city].filter(Boolean).join(", ");
  const whereDetail = locationDetail(prop.attributes);

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/properties"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden /> Catalogue
      </Link>

      <PropertyGallery media={gallery} title={title} />

      {/* ── What it is ── */}
      <header className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill status={prop.status} label={meta.label} size="sm" />
          <span className="text-micro uppercase text-ink-muted">{typeLabel}</span>
        </div>
        <h1 className="mt-3 text-display text-ink text-balance">{title}</h1>
        {(where || whereDetail) && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span>
              {where}
              {whereDetail && <span className="text-ink-subtle"> · {whereDetail}</span>}
            </span>
          </p>
        )}
      </header>

      {/*
        Main column carries everything the dealer reads; the sidebar carries
        everything he acts on. On a phone `order-last` keeps the private owner
        block and the status control below the specs and the waiting buyers.
      */}
      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
        {/* ── Act ── */}
        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24">
          <PropertyActions
            prop={prop}
            media={gallery}
            brandName={brandName}
            brandPhone={brandPhone}
          />

          <StatusChanger propertyId={prop.id} status={prop.status} txn={prop.transaction_type} />

          {contact && (contact.owner_name || contact.owner_phone) && (
            <Card className="p-5">
              <h2 className="flex items-center gap-1.5 text-micro uppercase text-ink-muted">
                <Lock className="size-3" strokeWidth={2.5} aria-hidden /> Owner contact
              </h2>
              <p className="mt-1.5 text-xs text-ink-subtle">
                Private — never included in shared listings.
              </p>
              <dl className="mt-4 flex flex-col gap-3.5 border-t border-line-subtle pt-4">
                {contact.owner_name && <Row label="Name" value={contact.owner_name} />}
                {contact.owner_phone && (
                  <Row label="Phone" value={formatPhoneIN(contact.owner_phone)} href={`tel:${contact.owner_phone.replace(/\D/g, "")}`} />
                )}
                {contact.owner_alt_phone && (
                  <Row label="Alt phone" value={formatPhoneIN(contact.owner_alt_phone)} href={`tel:${contact.owner_alt_phone.replace(/\D/g, "")}`} />
                )}
                {contact.brokerage_expected && (
                  <Row label="Brokerage" value={formatINRShort(contact.brokerage_expected)} />
                )}
              </dl>
              {contact.private_notes && (
                <p className="mt-4 border-t border-line-subtle pt-4 text-sm whitespace-pre-line text-ink-muted">
                  {contact.private_notes}
                </p>
              )}
            </Card>
          )}
        </aside>

        {/* ── Read ── */}
        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <PropertySpecs prop={prop} />

          {prop.description && (
            <Card className="p-5">
              <h2 className="text-micro uppercase text-ink-muted">Description</h2>
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink">
                {prop.description}
              </p>
            </Card>
          )}

          <BuyerMatches prop={prop} requirements={requirements} title={title} />

          {activeDeal && <DealSummaryCard deal={activeDeal} propertyId={prop.id} />}

          {tenancy && tenancy.length > 0 && <TenancyList items={tenancy} />}

          {shares && shares.length > 0 && <SharesList shares={shares} appUrl={appUrl} />}
        </div>
      </div>

      <PropertyDangerZone
        propertyId={prop.id}
        title={title}
        mediaCount={gallery.length}
        hasDeal={Boolean(activeDeal)}
        shareCount={(shares ?? []).length}
      />
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-micro uppercase text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-ink">
        {href ? (
          <a href={href} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            {value}
          </a>
        ) : value}
      </dd>
    </div>
  );
}
