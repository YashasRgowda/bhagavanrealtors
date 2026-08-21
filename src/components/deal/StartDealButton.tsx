"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";

export function StartDealButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/deal`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Start deal
      </Button>
      {err && <p className="text-sm text-[color:var(--danger)]">{err}</p>}
    </div>
  );
}
