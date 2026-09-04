"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_META, statusBlurb, statusLabel } from "@/lib/property/enums";
import { Loader2, Check } from "lucide-react";

/**
 * Only states that mean something different from each other.
 *
 * `rented` / `leased` used to sit here beside `parked` and did the same job —
 * archive the listing — except nothing in the app ever set them, and choosing
 * one left the page still offering "Mark as Rented" with no way to re-list.
 * A rental now has exactly one finished state, and it is the one the button
 * writes. They stay valid in the database for any older row.
 */
const CANONICAL: Record<string, string> = { rented: "parked", leased: "parked" };

const OPTIONS_BY_TXN: Record<string, string[]> = {
  sale:  ["available", "negotiating", "token", "sold", "withdrawn"],
  rent:  ["available", "negotiating", "parked", "withdrawn"],
  lease: ["available", "negotiating", "parked", "withdrawn"],
};

export function StatusChanger({
  propertyId, status, txn,
}: {
  propertyId: string;
  status: string;
  txn: "sale" | "rent" | "lease";
}) {
  const router = useRouter();
  // `rented` / `leased` are the retired twins of `parked`: same outcome, and
  // nothing writes them any more. An old row on one of those is shown as its
  // modern equivalent, otherwise the picker lists "Rented out" twice — once
  // for the dead value and once for the live one.
  const current = CANONICAL[status] ?? status;
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  // A status we still do not offer stays in the list, so the picker can never
  // open on a value that is not there.
  const base = OPTIONS_BY_TXN[txn] ?? Object.keys(STATUS_META);
  const options = base.includes(current) ? base : [current, ...base];
  const dirty = value !== current;

  async function save() {
    if (value === current) return;
    setBusy(true);
    const res = await fetch(`/api/properties/${propertyId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="eyebrow">Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Select className="flex-1" value={value} onChange={e => setValue(e.target.value)}>
            {options.map(s => <option key={s} value={s}>{statusLabel(s, txn)}</option>)}
          </Select>
          <Button
            variant={dirty ? "default" : "outline"}
            onClick={save}
            disabled={busy || !dirty}
            className="shrink-0"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Update
          </Button>
        </div>

        {/* A native select cannot carry a description inside its options — and
            on a phone it is the OS picker anyway — so the meaning of whatever
            is currently chosen sits underneath it instead. */}
        <p className="text-sm leading-snug text-ink-muted">
          {dirty && (
            <span className="font-medium text-ink">{statusLabel(value, txn)} — </span>
          )}
          {statusBlurb(value, txn)}
        </p>

        {dirty && (
          <p className="text-sm font-medium text-warning-text">
            Not saved yet — press Update.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
