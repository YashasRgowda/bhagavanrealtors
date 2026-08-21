"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2, X, AlertTriangle } from "lucide-react";

type Missing = { stage: string; stageTitle: string; field: string; label: string };

export function CloseDealButton({ dealId, ready, remainingCount }: {
  dealId: string;
  ready: boolean;
  remainingCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [missing, setMissing] = useState<Missing[] | null>(null);

  async function close() {
    setBusy(true); setErr(null); setMissing(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/close`, { method: "POST" });
      if (res.status === 422) {
        const data = await res.json();
        setMissing(data.missing ?? []);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      router.refresh(); // property is now sold → page renders the closed report
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Group missing fields by stage for a clean list.
  const grouped = missing
    ? Object.values(
        missing.reduce<Record<string, { title: string; fields: string[] }>>((acc, m) => {
          acc[m.stage] ??= { title: m.stageTitle, fields: [] };
          acc[m.stage].fields.push(m.label);
          return acc;
        }, {}),
      )
    : [];

  return (
    <Card className={ready ? "border-foreground/30 bg-muted/50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className={ready ? "h-5 w-5 text-foreground" : "h-5 w-5 text-faint"} />
          Close the deal
        </CardTitle>
        <CardDescription>
          {ready
            ? "Everything required is filled. Closing marks the property SOLD and moves it to the archive."
            : `${remainingCount} required field${remainingCount === 1 ? "" : "s"} still to fill across the steps above. Complete them, then close.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {missing && missing.length > 0 && (
          <div className="mb-3 rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/5 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-[color:var(--danger)]">
              <AlertTriangle className="h-4 w-4" /> Can&apos;t close yet — these are required:
            </p>
            <ul className="mt-2 space-y-1.5">
              {grouped.map(g => (
                <li key={g.title}>
                  <span className="font-medium">{g.title}:</span>{" "}
                  <span className="text-muted-foreground">{g.fields.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {err && <p className="mb-3 text-sm text-[color:var(--danger)]">{err}</p>}

        <Button onClick={close} disabled={busy || !ready} size="lg" className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Close deal &amp; mark Sold
        </Button>
        {!ready && (
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Button unlocks once every required field is filled &amp; saved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
