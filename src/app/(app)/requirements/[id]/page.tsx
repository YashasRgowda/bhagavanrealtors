import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { LookingForCard } from "@/components/requirement/LookingForCard";
import { PropertyMatchCard } from "@/components/match/PropertyMatchCard";
import { RequirementActions } from "@/components/requirement/RequirementActions";
import {
  REQUIREMENT_STATUS_META, URGENCY_META, type RequirementRow,
} from "@/lib/requirement/types";
import { formatPhoneIN, normalizeIndianMobile } from "@/lib/format/phone";
import { LIVE_STATUSES } from "@/lib/property/enums";
import { propertiesFor, type MatchProperty, type MatchRequirement } from "@/lib/match/engine";
import { ArrowLeft, Phone, MessageCircle, SearchX } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export const dynamic = "force-dynamic";

/** "Deepa Nair" → DN */
function initials(name: string): string {
  const words = name.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w.charAt(0)));
  return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("") || "?";
}

export default async function RequirementDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.from("requirements").select("*").eq("id", id).single();
  if (!data) notFound();
  const req = data as RequirementRow;

  const { data: props = [] } = await supabase
    .from("properties").select("*").in("status", LIVE_STATUSES as unknown as string[]);
  const properties = (props ?? []) as PropertyRow[];

  const { matches, needsCheck } = propertiesFor(
    req as MatchRequirement,
    properties as MatchProperty[],
  );

  // Cover photos for the matched properties. Read-only and additive — a broker
  // recognises a listing by its photo long before he reads the title.
  const shownIds = [...matches, ...needsCheck].map(m => m.property.id);
  const { data: media = [] } = shownIds.length
    ? await supabase
        .from("property_media")
        .select("*")
        .in("property_id", shownIds)
        .order("sort_order", { ascending: true })
    : { data: [] as PropertyMediaRow[] };

  const coverByProp: Record<string, PropertyMediaRow> = {};
  for (const m of (media ?? []) as PropertyMediaRow[]) {
    if (!coverByProp[m.property_id] || m.is_cover) coverByProp[m.property_id] = m;
  }

  const meta = REQUIREMENT_STATUS_META[req.status];
  const digits = req.buyer_phone ? normalizeIndianMobile(req.buyer_phone) : "";
  const wa = digits.length === 10 ? `91${digits}` : digits;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/requirements"
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden /> Buyers
      </Link>

      {/* ── Who ── */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-subtle text-h2 font-semibold text-accent-text"
            aria-hidden
          >
            {initials(req.buyer_name)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-h1 text-ink">{req.buyer_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {req.buyer_phone && (
                <span className="text-sm text-ink-muted">{formatPhoneIN(req.buyer_phone)}</span>
              )}
              <StatusPill status={req.status === "active" ? "available" : req.status === "fulfilled" ? "sold" : "parked"} label={meta.label} size="sm" />
              {req.status === "active" && req.urgency && (
                <Badge tone={req.urgency === "immediate" ? "warning" : "neutral"} size="sm">
                  {URGENCY_META[req.urgency].label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {req.buyer_phone && (
          <div className="flex shrink-0 items-center gap-2.5">
            <a href={`tel:${digits}`}>
              <Button variant="outline" size="lg"><Phone aria-hidden /> Call</Button>
            </a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
              <Button size="lg"><MessageCircle aria-hidden /> WhatsApp</Button>
            </a>
          </div>
        )}
      </header>

      {/*
        One grid for the whole body. On a phone `order-last` drops Manage below
        the matches — opening a buyer is about seeing what you can show them,
        not about editing their record. On lg, explicit placement lifts it back
        into the sidebar without duplicating any markup.
      */}
      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <LookingForCard r={req} />
        </div>

        <div className="order-last lg:order-none lg:col-start-2 lg:row-start-1">
          <RequirementActions requirement={req} />
        </div>

      {/* ── What you can show them ── */}
      <section className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-micro uppercase text-ink-muted">
            Matches · {matches.length}
          </h2>
          <span className="h-px flex-1 bg-line" aria-hidden />
        </div>

        {matches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-elevated px-5 py-10 text-center">
            <SearchX className="mx-auto size-5 text-ink-subtle" strokeWidth={1.75} aria-hidden />
            <p className="mt-3 text-sm text-ink-muted">
              Nothing in your live catalogue fits this yet.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {matches.map(({ property, result }) => (
              <li key={property.id}>
                <PropertyMatchCard
                  p={property as PropertyRow}
                  cover={coverByProp[property.id] ?? null}
                  result={result}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {needsCheck.length > 0 && (
        <section className="flex flex-col gap-4 lg:col-start-1 lg:row-start-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-micro uppercase text-ink-muted">
              Worth a look · {needsCheck.length}
            </h2>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="text-xs text-ink-subtle">Missing a detail — confirm before calling</span>
          </div>
          <ul className="flex flex-col gap-3">
            {needsCheck.map(({ property, result }) => (
              <li key={property.id}>
                <PropertyMatchCard
                  p={property as PropertyRow}
                  cover={coverByProp[property.id] ?? null}
                  result={result}
                  needsCheck
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
    </div>
  );
}
