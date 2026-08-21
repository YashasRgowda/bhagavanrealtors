"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, X } from "lucide-react";
import { Portal } from "@/components/ui/modal";
import { isIndianMobile } from "@/lib/format/phone";
import { formatINRShort } from "@/lib/format/currency";

export function RentCloseDialog({
  propertyId, txn, onClose,
}: {
  propertyId: string;
  txn: "rent" | "lease";
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    tenant_name: "",
    tenant_phone: "",
    rent_amount: "",
    deposit: "",
    lease_amount: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    notes: "",
  });

  const isRent = txn === "rent";

  async function submit() {
    setErr(null);
    if (f.tenant_phone && !isIndianMobile(f.tenant_phone)) {
      setErr("Tenant phone must be a valid 10-digit Indian mobile"); return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/close-rent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_name: f.tenant_name || null,
          tenant_phone: f.tenant_phone || null,
          rent_amount: isRent && f.rent_amount ? Number(f.rent_amount.replace(/\D/g, "")) : null,
          deposit: f.deposit ? Number(f.deposit.replace(/\D/g, "")) : null,
          lease_amount: !isRent && f.lease_amount ? Number(f.lease_amount.replace(/\D/g, "")) : null,
          start_date: f.start_date || null,
          end_date: f.end_date || null,
          notes: f.notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0a0a0a]/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-scale-in flex-col overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Mark as {isRent ? "Rented" : "Leased"}</CardTitle>
              <CardDescription>Property moves off the main page. You can reactivate any time.</CardDescription>
            </div>
            <button onClick={onClose} className="-m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tenant name</Label>
              <Input value={f.tenant_name} onChange={e => setF({ ...f, tenant_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tenant phone</Label>
              <Input inputMode="tel" value={f.tenant_phone} onChange={e => setF({ ...f, tenant_phone: e.target.value })} placeholder="10-digit mobile" />
            </div>
            {isRent ? (
              <div className="space-y-1.5">
                <Label>Final rent (₹/month)</Label>
                <Input inputMode="numeric" value={f.rent_amount} onChange={e => setF({ ...f, rent_amount: e.target.value })} />
                {f.rent_amount && <p className="mt-1 text-xs text-muted-foreground">{formatINRShort(Number(f.rent_amount.replace(/\D/g,"")))}/mo</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Lease amount (₹)</Label>
                <Input inputMode="numeric" value={f.lease_amount} onChange={e => setF({ ...f, lease_amount: e.target.value })} />
                {f.lease_amount && <p className="mt-1 text-xs text-muted-foreground">{formatINRShort(Number(f.lease_amount.replace(/\D/g,"")))}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Deposit (₹)</Label>
              <Input inputMode="numeric" value={f.deposit} onChange={e => setF({ ...f, deposit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Move-in date</Label>
              <Input type="date" value={f.start_date} onChange={e => setF({ ...f, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Agreement ends (optional)</Label>
              <Input type="date" value={f.end_date} onChange={e => setF({ ...f, end_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
          </div>
          {err && <p className="text-sm text-[color:var(--danger)]">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Mark {isRent ? "Rented" : "Leased"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </Portal>
  );
}
