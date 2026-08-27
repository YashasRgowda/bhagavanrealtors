"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPhoneIN, normalizeIndianMobile } from "@/lib/format/phone";
import { Loader2, Phone, MessageCircle, Check } from "lucide-react";

type Match = { id: string; buyer_name: string; buyer_phone: string | null; reasons: string[] };

/**
 * The payoff moment: the instant a property is added, tell the dealer who has
 * been waiting for it. Only confirmed matches are shown here — this screen is
 * a prompt to pick up the phone, so it must never be wrong.
 */
export function WaitingBuyers({ propertyId, title }: { propertyId: string; title: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}/matches`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setMatches(data.matches ?? []);
      } catch {
        if (alive) setMatches([]);   // silent: never block the "done" screen
      }
    })();
    return () => { alive = false; };
  }, [propertyId]);

  if (matches === null) {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your buyer register…
      </p>
    );
  }
  if (matches.length === 0) return null;

  return (
    <div className="mt-8 rounded-xl border border-foreground/25 bg-muted/40 p-5 text-left animate-fade-up">
      <p className="eyebrow">Waiting for exactly this</p>
      <p className="mt-2 font-display text-2xl leading-tight">
        {matches.length} {matches.length === 1 ? "buyer" : "buyers"} — call them now?
      </p>

      <div className="mt-4 space-y-2.5">
        {matches.map(m => {
          const digits = m.buyer_phone ? normalizeIndianMobile(m.buyer_phone) : "";
          const wa = digits.length === 10 ? `91${digits}` : digits;
          const msg = `Hi ${m.buyer_name}, I have a property that fits what you're looking for: ${title}. Shall I share the details?`;
          return (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5">
              <div className="min-w-0">
                <Link href={`/requirements/${m.id}`} className="font-medium">{m.buyer_name}</Link>
                {m.buyer_phone && (
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">{formatPhoneIN(m.buyer_phone)}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.reasons.map(r => (
                    <span key={r} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium">
                      <Check className="h-2.5 w-2.5" /> {r}
                    </span>
                  ))}
                </div>
              </div>
              {m.buyer_phone && (
                <div className="flex shrink-0 items-center gap-2">
                  <a href={`tel:${digits}`} aria-label={`Call ${m.buyer_name}`}
                     className="grid h-9 w-9 place-items-center rounded-md border border-border-strong bg-card transition-colors hover:border-foreground">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"
                     aria-label={`WhatsApp ${m.buyer_name}`}
                     className="grid h-9 w-9 place-items-center rounded-md border border-border-strong bg-card transition-colors hover:border-foreground">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
