"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Trash2, ExternalLink, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

type ShareRow = {
  id: string;
  token: string;
  preset: string | null;
  hide_owner: boolean;
  hide_address: boolean;
  view_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function SharesList({ shares, appUrl }: { shares: ShareRow[]; appUrl: string }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (shares.length === 0) return null;

  async function copy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this link? Anyone opening it will see 'link no longer available'.")) return;
    setBusyId(id);
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow">Shared links ({shares.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {shares.map(s => {
          const url = `${appUrl}/share/${s.token}`;
          const expired = s.expires_at ? new Date(s.expires_at) < new Date() : false;
          const revoked = Boolean(s.revoked_at);
          const dead = expired || revoked;
          return (
            <div key={s.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={dead ? "muted" : s.preset === "full" ? "warning" : "default"}>
                    {s.preset ?? "custom"}
                  </Badge>
                  {revoked && <Badge variant="danger">Revoked</Badge>}
                  {expired && !revoked && <Badge variant="danger">Expired</Badge>}
                  <span className="text-xs text-muted-foreground">
                    <Eye className="mr-0.5 inline h-3 w-3" /> {s.view_count} view{s.view_count === 1 ? "" : "s"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · created {safeDate(s.created_at)}
                    {s.expires_at ? ` · expires ${safeDate(s.expires_at)}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!dead && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => copy(url, s.id)}>
                        {copiedId === s.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <a href={url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                    </>
                  )}
                  {!revoked && (
                    <Button size="sm" variant="ghost" onClick={() => revoke(s.id)} disabled={busyId === s.id}>
                      {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-[color:var(--danger)]" />}
                    </Button>
                  )}
                </div>
              </div>
              {!dead && (
                <p className="mt-1 truncate text-xs text-muted-foreground font-mono">{url}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function safeDate(s: string): string {
  try { return format(new Date(s), "d MMM"); } catch { return s; }
}
