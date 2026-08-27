"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Trash2, ExternalLink, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

/**
 * Links you have sent out.
 *
 * The raw URL is no longer printed under every row — a wall of
 * `localhost:3000/share/8fMq1vs8qwr1i6` is unreadable and unscannable. What
 * the dealer actually wants is which preset went out, how many people opened
 * it, and a way to copy or kill it.
 */
export function SharesList({ shares, appUrl }: { shares: ShareRow[]; appUrl: string }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (shares.length === 0) return null;

  async function copy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function revoke(id: string) {
    setBusyId(id);
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmId(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-micro uppercase text-ink-muted">Shared links · {shares.length}</h2>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      <ul className="flex flex-col gap-2">
        {shares.map(s => {
          const url = `${appUrl}/share/${s.token}`;
          const expired = s.expires_at ? new Date(s.expires_at) < new Date() : false;
          const revoked = Boolean(s.revoked_at);
          const dead = expired || revoked;
          const confirming = confirmId === s.id;

          return (
            <li
              key={s.id}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-line bg-elevated p-4 shadow-sm",
                dead && "opacity-60",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Badge tone={dead ? "neutral" : s.preset === "full" ? "warning" : "accent"} size="sm">
                  {s.preset ?? "custom"}
                </Badge>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {revoked ? "Revoked" : expired ? "Expired"
                      : `${s.view_count} ${s.view_count === 1 ? "view" : "views"}`}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    Sent {safeDate(s.created_at)}
                    {s.expires_at && !revoked ? ` · expires ${safeDate(s.expires_at)}` : ""}
                  </p>
                </div>
                {!dead && s.view_count > 0 && (
                  <Eye className="size-4 shrink-0 text-ink-subtle" aria-hidden />
                )}
              </div>

              {confirming ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm text-ink-muted">Kill this link?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-subtle"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(s.id)}
                    disabled={busyId === s.id}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-danger px-3 text-sm font-medium text-on-solid transition-[filter] hover:brightness-110 disabled:opacity-60"
                  >
                    {busyId === s.id && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Revoke
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-1.5">
                  {!dead && (
                    <>
                      <IconBtn
                        onClick={() => copy(url, s.id)}
                        label={copiedId === s.id ? "Copied" : "Copy link"}
                      >
                        {copiedId === s.id
                          ? <Check className="size-4 text-accent-text" aria-hidden />
                          : <Copy className="size-4" aria-hidden />}
                      </IconBtn>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Preview as buyer"
                        className="grid size-10 place-items-center rounded-md border border-line bg-elevated text-ink transition-colors duration-160 pointer-coarse:size-11 hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    </>
                  )}
                  {!revoked && (
                    <IconBtn onClick={() => setConfirmId(s.id)} label="Revoke link" danger>
                      <Trash2 className="size-4" aria-hidden />
                    </IconBtn>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function IconBtn({
  onClick, label, danger, children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 place-items-center rounded-md border border-line bg-elevated transition-colors duration-160",
        "pointer-coarse:size-11 hover:border-line-strong hover:bg-subtle",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        danger ? "text-danger-text" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}

function safeDate(s: string): string {
  try { return format(new Date(s), "d MMM"); } catch { return s; }
}
