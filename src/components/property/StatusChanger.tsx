"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_META } from "@/lib/property/enums";
import { Loader2, Check } from "lucide-react";

const OPTIONS_BY_TXN: Record<string, string[]> = {
  sale:  ["available", "negotiating", "token", "sold", "withdrawn"],
  rent:  ["available", "negotiating", "rented", "parked", "withdrawn"],
  lease: ["available", "negotiating", "leased", "parked", "withdrawn"],
};

export function StatusChanger({
  propertyId, status, txn,
}: {
  propertyId: string;
  status: string;
  txn: "sale" | "rent" | "lease";
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  const options = OPTIONS_BY_TXN[txn] ?? Object.keys(STATUS_META);
  const dirty = value !== status;

  async function save() {
    if (value === status) return;
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
      <CardContent className="flex items-center gap-2">
        <Select className="flex-1" value={value} onChange={e => setValue(e.target.value)}>
          {options.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
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
      </CardContent>
    </Card>
  );
}
