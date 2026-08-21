"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { X, Ban, Loader2 } from "lucide-react";
import { Portal } from "@/components/ui/modal";

const REASONS = [
  { value: "buyer_dropped",  label: "Buyer dropped out" },
  { value: "loan_rejected",  label: "Buyer's loan rejected" },
  { value: "price_gap",      label: "Couldn't agree on price" },
  { value: "docs_issue",     label: "Document / legal issue found" },
  { value: "seller_pulled",  label: "Seller changed mind" },
  { value: "other",          label: "Other" },
] as const;

export function CancelDealButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reasonType, setReasonType] = useState<string>("");
  const [reasonNote, setReasonNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    setErr(null); setBusy(true);
    const composed = [REASONS.find(r => r.value === reasonType)?.label, reasonNote].filter(Boolean).join(" — ");
    try {
      const res = await fetch(`/api/deals/${dealId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: composed || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOpen(false);
      // Land on the cancelled report as confirmation, not on "Start a new deal".
      router.push(`${pathname}?history=1`);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" /> Cancel deal
      </Button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0a0a0a]/45 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <Card className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md animate-scale-in flex-col overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Cancel this deal?</CardTitle>
                  <CardDescription>
                    The deal record stays saved for your history. The property will go back on the Live catalogue as Available.
                  </CardDescription>
                </div>
                <button onClick={() => setOpen(false)} className="-m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
                  <option value="">— pick one —</option>
                  {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Details (optional)</Label>
                <Textarea rows={3} value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} placeholder="What happened, so you remember later" />
              </div>
              {err && <p className="text-sm text-[color:var(--danger)]">{err}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Keep deal</Button>
                <Button variant="danger" onClick={confirm} disabled={busy || !reasonType}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Ban className="h-4 w-4" /> Cancel deal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </Portal>
      )}
    </>
  );
}
