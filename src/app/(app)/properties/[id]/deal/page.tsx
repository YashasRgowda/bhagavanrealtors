import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STAGES } from "@/lib/deal/stages";
import { StepCard } from "@/components/deal/StepCard";
import { StartDealButton } from "@/components/deal/StartDealButton";
import { ClosedDealReport } from "@/components/deal/ClosedDealReport";
import { CancelDealButton } from "@/components/deal/CancelDealButton";
import { CloseDealButton } from "@/components/deal/CloseDealButton";
import { buildSellerValuesFromContact } from "@/lib/deal/prefill";
import { buildCtx, validateClose } from "@/lib/deal/validation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History, Briefcase } from "lucide-react";
import { formatINRShort } from "@/lib/format/currency";
import { PROPERTY_TYPES, STATUS_META, CLOSED_STATUSES } from "@/lib/property/enums";
import type { DealRow } from "@/lib/deal/types";
import type { PropertyRow } from "@/lib/property/types";

export const dynamic = "force-dynamic";

export default async function DealPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: p } = await supabase.from("properties").select("*").eq("id", id).single();
  if (!p) notFound();
  const prop = p as PropertyRow;
  if (prop.transaction_type !== "sale") {
    redirect(`/properties/${id}`);
  }

  const { data: allDeals } = await supabase
    .from("deals")
    .select("*")
    .eq("property_id", id)
    .order("created_at", { ascending: false });
  const deals = (allDeals ?? []) as DealRow[];

  const activeDeal = deals.find(d => d.is_active);
  const closedDeal = deals.find(d => !d.is_active);  // most recent closed (deals is already sorted desc)

  // ── Priority chain ──────────────────────────────────────────────
  //
  // 1. Active deal exists         → show pipeline (regardless of status)
  // 2. Property is in a CLOSED    → show closed deal report (sold/withdrawn etc.)
  //    lifecycle state
  // 3. No active deal + property  → offer to start a NEW deal
  //    is live again              (with a "view past deal" link if one exists)
  // 4. No deals at all            → offer to start the first deal
  //
  const isPropertyClosed = (CLOSED_STATUSES as readonly string[]).includes(prop.status);
  const wantHistory = sp.history === "1";

  // View toggle: if the user explicitly asked for history via ?history=1
  if (wantHistory && closedDeal) {
    const { data: seller } = await supabase
      .from("property_contacts").select("*").eq("property_id", id).maybeSingle();
    return (
      <ClosedDealReport propertyId={id} prop={prop} deal={closedDeal} seller={seller}
        backHref={`/properties/${id}/deal`} />
    );
  }

  if (activeDeal) {
    // Backfill seller_info from property_contacts on load — merges without
    //   overwriting any value the dealer has already filled in the deal.
    const sellerStep = activeDeal.steps?.seller_info;
    const currentValues = (sellerStep?.values ?? {}) as Record<string, unknown>;

    const { data: contact } = await supabase
      .from("property_contacts")
      .select("*")
      .eq("property_id", id)
      .maybeSingle();
    const prefill = buildSellerValuesFromContact(contact as Record<string, unknown> | null);

    // Only add fields that aren't already present in the deal (never clobber user input).
    const additions: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(prefill)) {
      const existing = currentValues[k];
      if (existing === undefined || existing === null || existing === "") {
        additions[k] = v;
      }
    }
    if (Object.keys(additions).length > 0) {
      const mergedValues = { ...currentValues, ...additions };
      const nextSteps = {
        ...(activeDeal.steps ?? {}),
        seller_info: {
          done: sellerStep?.done ?? false,
          values: mergedValues,
          attachments: sellerStep?.attachments ?? [],
        },
      };
      await supabase.from("deals").update({ steps: nextSteps }).eq("id", activeDeal.id);
      activeDeal.steps = nextSteps as typeof activeDeal.steps;
    }
    return <ActivePipeline id={id} prop={prop} deal={activeDeal} pastDealExists={!!closedDeal} />;
  }

  if (isPropertyClosed && closedDeal) {
    const { data: seller } = await supabase
      .from("property_contacts").select("*").eq("property_id", id).maybeSingle();
    return <ClosedDealReport propertyId={id} prop={prop} deal={closedDeal} seller={seller} />;
  }

  // Property is available/negotiating — offer to start a fresh deal.
  return (
    <NoActiveDeal
      propertyId={id}
      title={prop.title || "This property"}
      hasPastDeal={!!closedDeal}
    />
  );
}

/* ─── Active pipeline view ─── */

function ActivePipeline({
  id, prop, deal, pastDealExists,
}: { id: string; prop: PropertyRow; deal: DealRow; pastDealExists: boolean }) {
  const dealCtx = buildCtx(deal);
  const { ok: readyToClose, missing } = validateClose(deal);
  const doneCount = STAGES.filter(s => deal.steps?.[s.key]?.done).length;
  const total = STAGES.length;
  const progressPct = Math.round((doneCount / total) * 100);
  const currentIdx = STAGES.findIndex(s => s.key === deal.current_stage);
  const typeLabel = (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
    .find(t => t.value === prop.property_type)?.label ?? prop.property_type;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/properties/${id}`}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Property
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_META[prop.status].variant}>{STATUS_META[prop.status].label}</Badge>
          {pastDealExists && (
            <Link href={`/properties/${id}/deal?history=1`}>
              <Button variant="outline" size="sm"><History className="h-4 w-4" /> Past deal</Button>
            </Link>
          )}
          <CancelDealButton dealId={deal.id} />
        </div>
      </div>

      {/* ─── Deal summary ─── */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-5 p-6">
          <div className="min-w-0">
            <p className="eyebrow mb-2.5">Sale pipeline</p>
            <h1 className="font-display text-[1.625rem] leading-tight sm:text-[1.875rem]">
              {prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {typeLabel}{prop.locality ? ` · ${prop.locality}` : ""}
              {deal.buyer_name ? ` · Buyer: ${deal.buyer_name}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="eyebrow mb-2">Agreed</p>
            {deal.agreed_amount ? (
              <p className="tabular font-display text-[1.75rem] leading-none">
                {formatINRShort(deal.agreed_amount)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">To be agreed</p>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-muted/40 px-6 py-4">
          <div className="mb-2.5 flex items-center justify-between text-[0.6875rem] font-medium uppercase tracking-[0.09em]">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular text-foreground">
              {doneCount} / {total} steps · {progressPct}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-strong">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="space-y-2.5">
        {STAGES.map((s, i) => (
          <StepCard
            key={s.key}
            dealId={deal.id}
            stage={s}
            index={i}
            value={deal.steps?.[s.key]}
            defaultOpen={i === currentIdx && !deal.steps?.[s.key]?.done}
            ctx={dealCtx}
          />
        ))}
      </div>

      <CloseDealButton dealId={deal.id} ready={readyToClose} remainingCount={missing.length} />
    </div>
  );
}

/* ─── No-active-deal view ─── */

function NoActiveDeal({
  propertyId, title, hasPastDeal,
}: { propertyId: string; title: string; hasPastDeal: boolean }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/properties/${propertyId}`}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Property
      </Link>

      <Card>
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border-strong bg-muted text-foreground">
            <Briefcase className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="eyebrow mt-6">Sale pipeline</p>
          <h1 className="mx-auto mt-3 max-w-md font-display text-[1.75rem] leading-tight">
            {hasPastDeal ? "Start a new deal" : `Start a deal for ${title}`}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {hasPastDeal
              ? "The previous deal on this property was closed. Starting a new deal creates a fresh pipeline — your past record stays intact."
              : "Track the full Karnataka sale pipeline — token to agreement to registration to brokerage, step by step."}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <StartDealButton propertyId={propertyId} />
            {hasPastDeal && (
              <Link href={`/properties/${propertyId}/deal?history=1`}>
                <Button variant="outline" size="lg"><History className="h-4 w-4" /> View past deal</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
