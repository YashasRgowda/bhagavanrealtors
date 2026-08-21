import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_META, PROPERTY_TYPES } from "@/lib/property/enums";
import { formatINRShort, formatINR } from "@/lib/format/currency";
import { formatArea } from "@/lib/format/area";
import { formatPhoneIN } from "@/lib/format/phone";
import { StatusChanger } from "@/components/property/StatusChanger";
import { PropertyActions } from "@/components/property/PropertyActions";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { TenancyList } from "@/components/property/TenancyList";
import { DealSummaryCard } from "@/components/deal/DealSummaryCard";
import { SharesList } from "@/components/share/SharesList";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";
import type { DealRow } from "@/lib/deal/types";
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const meta = STATUS_META[prop.status];
  const typeLabel = (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>).find(t => t.value === prop.property_type)?.label ?? prop.property_type;

  const gallery = (media ?? []) as PropertyMediaRow[];

  const priceMain = prop.price
    ? formatINRShort(prop.price)
    : "On request";
  const priceSuffix = prop.price && prop.transaction_type === "rent" ? "/mo" : "";

  return (
    <div className="space-y-6">
      {/* ─── Back ─── */}
      <Link
        href="/properties"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Catalogue
      </Link>

      {/* ─── Gallery ─── */}
      <PropertyGallery
        media={gallery}
        title={prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`}
      />

      {/* ─── Title ─── */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className="eyebrow">{typeLabel}</span>
        </div>
        <h1 className="mt-3 font-display text-[1.875rem] leading-[1.12] sm:text-[2.25rem]">
          {prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`}
        </h1>
        {(prop.locality || prop.city) && (
          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {[prop.locality, prop.city].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <div className="rule-fade" />

      {/*
        Two-column body. The sidebar (price + actions) is rendered FIRST so that
        on a phone — where this collapses to one column — the dealer sees the
        price and the primary action immediately under the title, not buried
        below the specs. `lg:order-*` restores main-left / sidebar-right on desktop.
      */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        {/* ── Sticky sidebar ── */}
        <aside className="space-y-4 lg:order-2 lg:sticky lg:top-24">
          {/* Price + actions */}
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/50 px-5 py-5">
              <p className="eyebrow">
                {prop.transaction_type === "rent"
                  ? "Monthly rent"
                  : prop.transaction_type === "lease"
                    ? "Lease amount"
                    : "Asking price"}
              </p>
              <p className="tabular mt-2 font-display text-[2.25rem] leading-none">
                {priceMain}
                {priceSuffix && (
                  <span className="ml-1 font-sans text-sm font-medium tracking-normal text-muted-foreground">
                    {priceSuffix}
                  </span>
                )}
              </p>
              {prop.price ? (
                <p className="tabular mt-2 text-xs text-muted-foreground">{formatINR(prop.price)}</p>
              ) : null}
              {prop.is_negotiable && prop.transaction_type === "sale" ? (
                <p className="mt-2 text-xs text-muted-foreground">Negotiable</p>
              ) : null}
            </div>
            <CardContent className="p-5">
              <PropertyActions
                prop={prop}
                media={gallery}
                hasDeal={Boolean(activeDeal)}
                shareCount={(shares ?? []).length}
              />
            </CardContent>
          </Card>

          {/* Status */}
          <StatusChanger propertyId={prop.id} status={prop.status} txn={prop.transaction_type} />

          {/* Owner contact (private) */}
          {contact && (contact.owner_name || contact.owner_phone) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="eyebrow flex items-center gap-1.5">
                  <Lock className="h-3 w-3" strokeWidth={2} /> Owner contact
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Private — never included in shared listings.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
                {contact.owner_name && <Spec label="Name" value={contact.owner_name} />}
                {contact.owner_phone && <Spec label="Phone" value={formatPhoneIN(contact.owner_phone)} />}
                {contact.owner_alt_phone && <Spec label="Alt" value={formatPhoneIN(contact.owner_alt_phone)} />}
                {contact.brokerage_expected && (
                  <Spec label="Brokerage" value={formatINRShort(contact.brokerage_expected)} />
                )}
                {contact.private_notes && (
                  <div className="col-span-full">
                    <p className="eyebrow mb-1.5">Private notes</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{contact.private_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </aside>

        {/* ── Main column ── */}
        <div className="space-y-5 lg:order-1">
          {/* Specs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="eyebrow">Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <Spec label="Type" value={typeLabel} />
              <Spec label="Deal" value={prop.transaction_type} />
              {prop.bhk && <Spec label="Configuration" value={prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK`} />}
              {prop.area_value && <Spec label="Area" value={formatArea(prop.area_value, prop.area_unit)} />}
              {prop.deposit && <Spec label="Deposit" value={formatINRShort(prop.deposit)} />}
              {Object.entries(prop.attributes || {})
                // Skip internal bookkeeping keys (e.g. _area_auto) and blanks.
                .filter(([k, v]) => !k.startsWith("_") && v !== null && v !== "" && v !== undefined)
                .slice(0, 12)
                .map(([k, v]) => (
                  <Spec key={k} label={k.replace(/_/g, " ")} value={String(v)} />
                ))}
            </CardContent>
          </Card>

          {/* Description */}
          {prop.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="eyebrow">Description</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {prop.description}
              </CardContent>
            </Card>
          )}

          {/* Active sale deal */}
          {activeDeal && <DealSummaryCard deal={activeDeal} propertyId={prop.id} />}

          {/* Tenancy history */}
          {tenancy && tenancy.length > 0 && <TenancyList items={tenancy} />}

          {/* Shared links */}
          {shares && shares.length > 0 && <SharesList shares={shares} appUrl={appUrl} />}
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 truncate text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
