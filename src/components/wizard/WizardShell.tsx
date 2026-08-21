"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function WizardShell({
  step,
  total,
  labels,
  heading,
  children,
}: {
  step: number;
  total: number;
  /** Short labels under the stepper dots. */
  labels: string[];
  /** Full page title for the current step. Falls back to the short label. */
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2.5">New listing</p>
          <h1 className="font-display text-[1.75rem] leading-tight sm:text-[2rem]">
            {heading ?? labels[step - 1] ?? "Add property"}
          </h1>
        </div>
        <p className="tabular shrink-0 pb-1 text-[0.8125rem] font-medium text-muted-foreground">
          Step {step}
          <span className="text-faint"> / {total}</span>
        </p>
      </div>

      {/* ─── Stepper ─── */}
      <ol className="mt-7 flex items-start">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={n} className={cn("flex min-w-0 items-start", n < total && "flex-1")}>
              <div className="flex w-9 shrink-0 flex-col items-center gap-2">
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-semibold transition-all duration-300",
                    done && "border-foreground bg-foreground text-background",
                    active && "border-foreground bg-card text-foreground ring-[3px] ring-foreground/10",
                    !done && !active && "border-border-strong bg-card text-faint",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : n}
                </div>
                <span
                  className={cn(
                    "hidden max-w-[5.5rem] truncate text-center text-[0.625rem] font-medium uppercase tracking-[0.08em] sm:block",
                    active ? "text-foreground" : done ? "text-muted-foreground" : "text-faint",
                  )}
                >
                  {labels[i]}
                </span>
              </div>
              {n < total && (
                <div
                  className={cn(
                    "mt-[13px] h-px min-w-2 flex-1 transition-colors duration-300",
                    done ? "bg-foreground" : "bg-border-strong",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8">{children}</div>
    </div>
  );
}
