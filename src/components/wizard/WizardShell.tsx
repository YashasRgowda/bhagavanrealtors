"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { DUR, EASE_OUT, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Wizard chrome: header, progress, scrolling body, and a sticky action bar.
 *
 * The action bar is pinned above the bottom nav rather than sitting inline
 * under the content. On the Fold's 344 × 882 cover screen the step-2 card
 * only fills the top third, which left "Continue" stranded mid-screen and
 * well outside the thumb zone. Pinning it means the primary action is in the
 * same place on every step, at every screen height.
 */
export function WizardShell({
  step,
  total,
  labels,
  heading,
  eyebrow = "New listing",
  actions,
  children,
}: {
  step: number;
  total: number;
  labels: string[];
  heading?: string;
  eyebrow?: string;
  /** Rendered inside the sticky bar. */
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  const m = useMotionPrefs();
  // Measured against steps *reached*, not steps completed: on step 1 the
  // (step-1)/(total-1) form renders an empty bar, which reads as "nothing has
  // happened yet" rather than "you are one of five in".
  const pct = Math.round((step / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-micro uppercase text-ink-muted">{eyebrow}</p>
          <h1 className="mt-2.5 text-h1 text-ink text-balance">
            {heading ?? labels[step - 1] ?? "Add property"}
          </h1>
        </div>
        <p className="shrink-0 pt-1 text-sm font-medium text-ink-muted">
          <span className="text-ink">{step}</span>
          <span className="text-ink-subtle"> / {total}</span>
        </p>
      </div>

      {/* ── Progress ──
          A continuous bar carries the sense of travel; the dots carry "which
          step". Both are needed: the bar alone loses the map, the dots alone
          lose the momentum. */}
      <div className="mt-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-inset">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={m.animate ? { duration: DUR.slow, ease: EASE_OUT } : { duration: 0 }}
          />
        </div>

        <ol className="mt-4 flex items-start">
          {Array.from({ length: total }).map((_, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <li
                key={n}
                className={cn("flex min-w-0 items-start", n < total && "flex-1")}
              >
                <div className="flex w-9 shrink-0 flex-col items-center gap-2">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      "transition-[background-color,border-color,color,box-shadow] duration-220 ease-out-expo",
                      done && "border-accent bg-accent text-accent-fg",
                      active && "border-accent bg-elevated text-accent-text ring-3 ring-accent/15",
                      !done && !active && "border-line-strong bg-elevated text-ink-subtle",
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
                  </span>
                  {/* Labels need ~64px each; below `sm` there isn't room for
                      five, so the heading above carries the step name. */}
                  <span
                    className={cn(
                      "hidden max-w-22 truncate text-center text-nav uppercase sm:block",
                      active ? "text-ink" : done ? "text-ink-muted" : "text-ink-subtle",
                    )}
                  >
                    {labels[i]}
                  </span>
                </div>
                {n < total && (
                  <span
                    className={cn(
                      "mt-3.5 h-px min-w-1.5 flex-1 transition-colors duration-220 ease-out-expo",
                      done ? "bg-accent" : "bg-line",
                    )}
                    aria-hidden
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Body ── */}
      <div className="mt-7 pb-nav-bar md:pb-24">{children}</div>

      {/* ── Sticky actions ── */}
      <div className="above-nav fixed inset-x-0 z-40 border-t border-line bg-elevated/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          {actions}
        </div>
      </div>
    </div>
  );
}
