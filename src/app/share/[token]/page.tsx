import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatINRShort, formatINR } from "@/lib/format/currency";
import { formatArea } from "@/lib/format/area";
import { PROPERTY_TYPES } from "@/lib/property/enums";
import type { ShareFields } from "@/lib/share/presets";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";
import { MapPin, ShieldCheck, Ban } from "lucide-react";
import { RevealPhone } from "./RevealPhone";
import { WhatsappShare } from "./WhatsappShare";
import { PhotoWithWatermark } from "./PhotoWithWatermark";

export const dynamic = "force-dynamic";

export default async function SharedListingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Service-role client — this page is public, no user session.
  const sb = createSupabaseServiceClient();

  const { data: share } = await sb
    .from("share_events")
    .select("*, properties(*)")
    .eq("token", token)
    .maybeSingle();

  if (!share) notFound();

  // Revocation / expiry gates.
  const revoked = share.revoked_at !== null;
  const expired = share.expires_at ? new Date(share.expires_at) < new Date() : false;
  if (revoked || expired) return <UnavailablePage reason={revoked ? "revoked" : "expired"} />;

  const prop = share.properties as PropertyRow;
  const fields = (share.fields ?? {}) as ShareFields;
  const mediaIds = (share.media_ids ?? []) as string[];

  // Also block if the property itself has been closed by the dealer.
  if (["sold", "withdrawn"].includes(prop.status)) {
    return <UnavailablePage reason="unavailable" />;
  }

  // Fire-and-forget view count bump (public page → service role).
  await sb.from("share_events")
    .update({ view_count: (share.view_count ?? 0) + 1 })
    .eq("id", share.id);

  const { data: mediaRows = [] } = mediaIds.length
    ? await sb.from("property_media").select("*").in("id", mediaIds).order("sort_order")
    : { data: [] as PropertyMediaRow[] };
  const media = (mediaRows ?? []) as PropertyMediaRow[];

  // Dealer profile — brand name / brand phone are the ONLY contact on the shared page.
  const { data: profile } = await sb
    .from("profiles").select("brand_name, brand_phone, full_name, phone")
    .eq("id", share.owner_user_id).single();
  const brandName = profile?.brand_name || profile?.full_name || "Bhagvan Realtors";
  const brandPhone = profile?.brand_phone || profile?.phone || null;

  const typeLabel = (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
    .find(t => t.value === prop.property_type)?.label ?? prop.property_type;

  const priceLabel = prop.price ? formatINRShort(prop.price) : "Price on request";
  const priceSuffix = prop.price && prop.transaction_type === "rent" ? "/mo" : "";

  const locationBits = [
    fields.building && (prop.attributes as Record<string, unknown> | null)?.building as string | undefined,
    fields.address_text && !share.hide_address ? prop.address_text : null,
    fields.locality ? prop.locality : null,
    fields.city ? prop.city : null,
  ].filter(Boolean) as string[];

  const extraPhotos = media.filter(m => m.type === "image").slice(1);

  // Only the specs the dealer actually chose to share — the strip sizes itself
  // to however many that is, so it never renders half-empty.
  const specTiles: Array<{ label: string; value: string }> = [
    fields.bhk && prop.bhk
      ? { label: "Configuration", value: prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK` }
      : null,
    fields.area && prop.area_value
      ? { label: "Area", value: formatArea(prop.area_value, prop.area_unit) }
      : null,
    fields.deposit && prop.deposit
      ? { label: "Deposit", value: formatINRShort(prop.deposit) }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ─── Brand bar ─── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-foreground font-display text-[1.0625rem] leading-none text-background">
              {brandName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-[1.0625rem] leading-tight">{brandName}</p>
              <p className="mt-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.18em] text-faint">
                Verified agent
              </p>
            </div>
          </div>
          {brandPhone && <RevealPhone phone={brandPhone} />}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-7">
        {/* ─── Hero ─── */}
        {fields.photos && media.length > 0 && media[0].type === "image" ? (
          <PhotoWithWatermark
            src={media[0].url}
            brand={brandName}
            className="aspect-[4/3] overflow-hidden rounded-xl border border-border sm:aspect-[16/10]"
          />
        ) : fields.video && media.find(m => m.type === "video") ? (
          <video
            src={media.find(m => m.type === "video")!.url}
            controls playsInline preload="metadata"
            className="aspect-video w-full rounded-xl border border-border bg-black"
          />
        ) : null}

        {/* ─── Title / price ─── */}
        <section>
          <p className="eyebrow">{typeLabel}</p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:flex-1">
              {fields.title && (
                <h1 className="font-display text-[1.875rem] leading-[1.1] sm:text-[2.375rem]">
                  {prop.title || `${typeLabel} in ${prop.locality ?? prop.city ?? ""}`}
                </h1>
              )}
              {locationBits.length > 0 && (
                <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {locationBits.join(", ")}
                </p>
              )}
            </div>
            {fields.price && (
              <div className="shrink-0 sm:text-right">
                <p className="tabular font-display text-[2rem] leading-none">
                  {priceLabel}
                  {priceSuffix && (
                    <span className="ml-1 font-sans text-sm font-medium tracking-normal text-muted-foreground">
                      {priceSuffix}
                    </span>
                  )}
                </p>
                {prop.price && (
                  <p className="tabular mt-2 text-[0.6875rem] text-muted-foreground">{formatINR(prop.price)}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ─── Key specs ─── */}
        {specTiles.length > 0 && (
          <section
            className="grid divide-x divide-border overflow-hidden rounded-xl border border-border bg-card text-center"
            style={{ gridTemplateColumns: `repeat(${specTiles.length}, minmax(0, 1fr))` }}
          >
            {specTiles.map(t => (
              <SpecTile key={t.label} label={t.label} value={t.value} />
            ))}
          </section>
        )}

        {/* ─── Attributes ─── */}
        {fields.attributes && prop.attributes && Object.keys(prop.attributes).length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="eyebrow border-b border-border pb-3">Details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              {Object.entries(prop.attributes)
                .filter(([k, v]) => !k.startsWith("_") && v !== null && v !== "" && v !== undefined)
                .slice(0, 18)
                .map(([k, v]) => {
                return (
                  <div key={k} className="min-w-0">
                    <dt className="eyebrow">{k.replace(/_/g, " ")}</dt>
                    <dd className="mt-1.5 truncate text-sm font-medium capitalize">{String(v)}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* ─── Description ─── */}
        {fields.description && prop.description && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="eyebrow border-b border-border pb-3">Description</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
              {prop.description}
            </p>
          </section>
        )}

        {/* ─── Gallery ─── */}
        {fields.photos && extraPhotos.length > 0 && (
          <section className="grid grid-cols-3 gap-2.5">
            {extraPhotos.map(m => (
              <PhotoWithWatermark
                key={m.id}
                src={m.thumb_url || m.url}
                brand={brandName}
                className="aspect-square overflow-hidden rounded-lg border border-border"
              />
            ))}
          </section>
        )}

        {/* ─── Contact ─── */}
        <section className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] px-6 py-10 text-center text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "76px 76px",
            }}
          />
          <div className="relative">
            <p className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-white/45">
              Interested?
            </p>
            <p className="mt-4 font-display text-[1.75rem] leading-tight">Speak with {brandName}</p>
            {brandPhone ? (
              <div
                className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row
                  [&_a]:w-full [&_a]:sm:w-auto
                  [&_button]:w-full [&_button]:border-white [&_button]:bg-white [&_button]:text-[#0a0a0a]
                  [&_button]:shadow-none [&_button]:hover:bg-white/88 [&_button]:sm:w-auto"
              >
                <RevealPhone phone={brandPhone} big />
                <WhatsappShare
                  phone={brandPhone}
                  propertyTitle={prop.title || `${typeLabel} in ${prop.locality ?? ""}`}
                />
              </div>
            ) : (
              <p className="mt-5 text-sm text-white/55">Contact details not available.</p>
            )}
          </div>
        </section>

        {/* ─── Privacy note ─── */}
        <section className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" strokeWidth={1.75} />
          <p>
            This listing was shared privately. Owner contact and exact address are intentionally
            hidden — all visits and negotiations go through <strong className="font-semibold text-foreground">{brandName}</strong>.
          </p>
        </section>

        <footer className="pb-10 pt-3 text-center text-[0.625rem] font-medium uppercase tracking-[0.16em] text-faint">
          Powered by Bhagvan Realtors · Private listing
        </footer>
      </main>
    </div>
  );
}

function SpecTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-[0.9375rem] font-semibold">{value}</p>
    </div>
  );
}

function UnavailablePage({ reason }: { reason: "revoked" | "expired" | "unavailable" }) {
  const msg = reason === "revoked"
    ? "This listing has been withdrawn by the agent."
    : reason === "expired"
    ? "This share link has expired."
    : "This property is no longer available.";
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border-strong bg-card text-muted-foreground">
          <Ban className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h1 className="mt-6 font-display text-2xl leading-tight">{msg}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Please ask the agent for an updated link.</p>
      </div>
    </div>
  );
}
