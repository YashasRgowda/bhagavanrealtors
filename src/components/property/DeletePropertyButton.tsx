"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Loader2, X, AlertTriangle } from "lucide-react";
import { Portal } from "@/components/ui/modal";

const CONFIRM_WORD = "DELETE";

/**
 * Permanently erase a listing. Deliberately high-friction: this cascades to the
 * deal history, tenancy records and every uploaded file, and none of it is
 * recoverable — so the dealer has to type the confirm word, not just tap twice.
 */
export function DeletePropertyButton({
  propertyId,
  title,
  mediaCount,
  hasDeal,
  shareCount,
}: {
  propertyId: string;
  title: string;
  mediaCount: number;
  hasDeal: boolean;
  shareCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const armed = typed.trim().toUpperCase() === CONFIRM_WORD;

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setErr(null);
  }

  async function confirmDelete() {
    if (!armed) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Delete failed");
      }
      // Leave before refreshing — the page we're on no longer exists.
      router.replace("/properties");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const consequences = [
    `${mediaCount} photo${mediaCount === 1 ? "" : "s"} / video${mediaCount === 1 ? "" : "s"} and every uploaded document`,
    hasDeal ? "the full deal history — buyer details, payments and paperwork" : null,
    shareCount > 0
      ? `${shareCount} share link${shareCount === 1 ? "" : "s"} — anyone holding one will see “no longer available”`
      : null,
    "the private owner contact and your notes",
  ].filter(Boolean) as string[];

  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        className="w-full text-[color:var(--danger)] hover:bg-[color:var(--danger)]/8 hover:text-[color:var(--danger)]"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" /> Delete listing
      </Button>

      {open && (
        <Portal>
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0a0a0a]/45 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <Card
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-scale-in flex-col overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/8 text-[color:var(--danger)]">
                    <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="eyebrow text-[color:var(--danger)]">Permanent deletion</p>
                    <h2 id="delete-title" className="mt-2 font-display text-2xl leading-tight">
                      Delete this listing?
                    </h2>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="-m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-5 truncate rounded-lg border border-border bg-muted/50 px-3.5 py-3 text-sm font-medium">
                {title}
              </p>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                This erases the listing from the database for good. It is{" "}
                <strong className="font-semibold text-foreground">not archived</strong> and{" "}
                <strong className="font-semibold text-foreground">cannot be undone</strong>. You
                will also lose:
              </p>

              <ul className="mt-3.5 space-y-2">
                {consequences.map(c => (
                  <li key={c} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-[color:var(--danger)]" />
                    <span className="text-muted-foreground">{c}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                To keep the record but take it off the live catalogue, close this and set the
                status to <strong className="font-medium text-foreground">Withdrawn</strong> instead.
              </p>

              <div className="mt-6 space-y-2">
                <label htmlFor="confirm-delete" className="block text-[0.8125rem] font-medium">
                  Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
                </label>
                <Input
                  id="confirm-delete"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && armed) confirmDelete(); }}
                  placeholder={CONFIRM_WORD}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono tracking-[0.08em]"
                  disabled={busy}
                />
              </div>

              {err && (
                <p className="mt-4 rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
                  {err}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button variant="outline" size="lg" onClick={close} disabled={busy}>
                  Keep listing
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={confirmDelete}
                  disabled={!armed || busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete permanently
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
