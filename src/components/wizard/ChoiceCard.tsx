"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The wizard's tappable choices.
 *
 * Fold-critical: below `xs` (400px) these are full-width rows, because three
 * chips across a 344px cover screen forces "Land / Plot" onto two lines while
 * its neighbours stay on one — uneven boxes that read as broken. Stacking is
 * also the easier target for a thumb on a narrow screen.
 *
 * Selection is shown three ways at once — accent border, tinted fill, and a
 * solid check — so it survives sunlight, colour-blindness and a cheap panel.
 */

export function ChoiceGrid({
  columns,
  children,
  className,
}: {
  /** Columns from `xs` (400px) upward. Always 1 column below that. */
  columns: 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn(
        "grid grid-cols-1 gap-2.5",
        /* Stacked on every phone, not just the narrow ones.
           Three across needs ~600px before the label stops colliding with the
           check badge, and on a 390–430px handset a full-width row is the
           easier target anyway. Columns start at `sm`, which is also where the
           Fold's unfolded inner screen lands. */
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChoiceCard({
  selected,
  onSelect,
  label,
  description,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  /** Present on the deal-type step; absent on the compact chips. */
  description?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-md border p-4 text-left",
        "min-h-14",
        "transition-[background-color,border-color,box-shadow,transform] duration-160 ease-out-expo",
        "active:scale-98",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-accent bg-accent-subtle shadow-sm"
          : "border-line bg-elevated hover:border-line-strong hover:bg-subtle",
        description ? "flex-col items-start gap-1.5 sm:min-h-28" : "",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1",
          description ? "pr-8" : "pr-7",
        )}
      >
        <span
          className={cn(
            "block text-sm font-medium text-balance",
            selected ? "text-accent-text" : "text-ink",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="mt-1.5 block text-xs text-ink-muted">{description}</span>
        )}
      </span>

      {/* Fixed position so a one-line and a two-line card agree optically. */}
      <span
        className={cn(
          "absolute top-4 right-4 grid size-5 shrink-0 place-items-center rounded-full border",
          "transition-[background-color,border-color] duration-160 ease-out-expo",
          selected
            ? "border-accent bg-accent text-accent-fg"
            : "border-line-strong bg-elevated text-transparent",
        )}
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </button>
  );
}
