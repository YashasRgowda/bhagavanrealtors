"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { RentCloseDialog } from "./RentCloseDialog";
import { PosterStudio } from "./PosterStudio";
import { ShareComposer } from "@/components/share/ShareComposer";
import { formatINR } from "@/lib/format/currency";
import { Briefcase, Home, RefreshCw, Share2, Pencil, Sparkles } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

/**
 * Price and what you can do about it.
 *
 * These five actions used to be five identical full-width buttons stacked in
 * one column, which said they were five equal choices. They are not: one moves
 * the deal forward, two put the listing in front of buyers, one is maintenance,
 * and one is irreversible. The layout now says that — a single solid primary,
 * a paired row for the outbound tools, a quiet link for editing. Delete has
 * left this stack entirely; it lives in its own zone at the foot of the page,
 * so it can never be the button you hit while reaching for Edit.
 */
export function PropertyActions({
  prop, media, brandName = "", brandPhone = null,
}: {
  prop: PropertyRow;
  media: PropertyMediaRow[];
  brandName?: string;
  brandPhone?: string | null;
}) {
  const router = useRouter();
  const [showClose, setShowClose] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reactivate() {
    setBusy(true);
    const res = await fetch(`/api/properties/${prop.id}/reactivate`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const isSale = prop.transaction_type === "sale";
  const isRentLike = prop.transaction_type === "rent" || prop.transaction_type === "lease";
  const isParked = prop.status === "parked";
  const isSold = prop.status === "sold";

  const priceLabel =
    prop.transaction_type === "rent" ? "Monthly rent"
    : prop.transaction_type === "lease" ? "Lease amount"
    : "Asking price";

  return (
    <>
      <Card className="overflow-hidden">
        {/* ── Price ── */}
        <div className="border-b border-line bg-subtle px-5 py-5">
          <p className="text-micro uppercase text-ink-muted">{priceLabel}</p>
          {prop.price ? (
            <>
              <p className="mt-2 text-display text-ink">
                <Money rupees={prop.price} suffix={prop.transaction_type === "rent" ? "/mo" : undefined} />
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">
                {formatINR(prop.price)}
                {prop.is_negotiable && isSale ? " · Negotiable" : ""}
              </p>
            </>
          ) : (
            <p className="mt-2 text-h2 text-ink-subtle">On request</p>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col gap-2.5 p-5">
          {isSale && (
            <Link href={`/properties/${prop.id}/deal`} className="block">
              <Button variant={isSold ? "outline" : "primary"} size="lg" block>
                <Briefcase aria-hidden />
                {isSold ? "View deal summary" : "Open deal pipeline"}
              </Button>
            </Link>
          )}

          {isRentLike && !isParked && (
            <Button size="lg" block onClick={() => setShowClose(true)}>
              <Home aria-hidden />
              Mark as {prop.transaction_type === "lease" ? "Leased" : "Rented"}
            </Button>
          )}

          {isRentLike && isParked && (
            <Button size="lg" block onClick={reactivate} loading={busy}>
              <RefreshCw aria-hidden /> Vacant again · Re-list
            </Button>
          )}

          {/* Siblings — both put the listing in front of a buyer. */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" size="lg" onClick={() => setShowShare(true)}>
              <Share2 aria-hidden /> Share
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowPoster(true)}>
              <Sparkles aria-hidden /> Poster
            </Button>
          </div>

          <Link href={`/properties/${prop.id}/edit`} className="block">
            <Button variant="ghost" size="lg" block>
              <Pencil aria-hidden /> Edit listing &amp; photos
            </Button>
          </Link>
        </div>
      </Card>

      {showShare && (
        <ShareComposer propertyId={prop.id} media={media} onClose={() => setShowShare(false)} />
      )}
      {showPoster && (
        <PosterStudio
          prop={prop}
          brandName={brandName || "Bhagvan Realtors"}
          brandPhone={brandPhone}
          onClose={() => setShowPoster(false)}
        />
      )}
      {showClose && isRentLike && (
        <RentCloseDialog
          propertyId={prop.id}
          txn={prop.transaction_type as "rent" | "lease"}
          onClose={() => setShowClose(false)}
        />
      )}
    </>
  );
}
