"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RentCloseDialog } from "./RentCloseDialog";
import { DeletePropertyButton } from "./DeletePropertyButton";
import { ShareComposer } from "@/components/share/ShareComposer";
import { Briefcase, Home, RefreshCw, Loader2, Share2, Pencil } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export function PropertyActions({
  prop, media, hasDeal = false, shareCount = 0,
}: {
  prop: PropertyRow;
  media: PropertyMediaRow[];
  hasDeal?: boolean;
  shareCount?: number;
}) {
  const router = useRouter();
  const [showClose, setShowClose] = useState(false);
  const [showShare, setShowShare] = useState(false);
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

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {isSale && (
          <Link href={`/properties/${prop.id}/deal`} className="block">
            <Button variant={isSold ? "outline" : "default"} size="lg" className="w-full">
              <Briefcase className="h-4 w-4" />
              {isSold ? "View deal summary" : "Open deal pipeline"}
            </Button>
          </Link>
        )}

        {isRentLike && !isParked && (
          <Button size="lg" className="w-full" onClick={() => setShowClose(true)}>
            <Home className="h-4 w-4" />
            Mark as {prop.transaction_type === "lease" ? "Leased" : "Rented"}
          </Button>
        )}

        {isRentLike && isParked && (
          <Button size="lg" className="w-full" onClick={reactivate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Vacant again / Re-list
          </Button>
        )}

        <Button variant="outline" size="lg" className="w-full" onClick={() => setShowShare(true)}>
          <Share2 className="h-4 w-4" /> Share listing
        </Button>

        <Link href={`/properties/${prop.id}/edit`} className="block">
          <Button variant="ghost" size="lg" className="w-full">
            <Pencil className="h-4 w-4" /> Edit listing &amp; photos
          </Button>
        </Link>

        <div className="rule-fade my-1" />

        <DeletePropertyButton
          propertyId={prop.id}
          title={prop.title || "This property"}
          mediaCount={media.length}
          hasDeal={hasDeal}
          shareCount={shareCount}
        />
      </div>

      {showShare && (
        <ShareComposer propertyId={prop.id} media={media} onClose={() => setShowShare(false)} />
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
