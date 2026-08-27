"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { SPRING, useMotionPrefs, layoutIds } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type SegmentItem = {
  value: string;
  label: string;
  /** Renders as a <Link> when set, a <button> otherwise. */
  href?: string;
  count?: number;
};

/**
 * Segmented control with a sliding active indicator.
 *
 * The pill travels between options via a shared `layoutId` rather than
 * hard-jumping — it is the cheapest way to make a switch feel engineered.
 * Under reduced motion the indicator cross-fades in place instead.
 */
export function Segmented({
  items,
  value,
  onChange,
  group = "default",
  className,
  "aria-label": ariaLabel,
}: {
  items: SegmentItem[];
  value: string;
  onChange?: (value: string) => void;
  group?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const m = useMotionPrefs();

  return (
    <div
      role={onChange ? "tablist" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-subtle p-1",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;

        const inner = (
          <>
            {active && (
              <motion.span
                layoutId={m.animate ? layoutIds.segment(group) : undefined}
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-elevated shadow-sm"
                aria-hidden
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-medium transition-colors duration-160",
                    active ? "bg-accent-subtle text-accent-text" : "bg-inset text-ink-subtle",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </>
        );

        const classes = cn(
          "relative inline-flex h-9 items-center rounded-full px-4 text-sm font-medium pointer-coarse:h-11",
          "transition-colors duration-160 ease-out-expo",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active ? "text-ink" : "text-ink-muted hover:text-ink",
        );

        return item.href ? (
          <Link
            key={item.value}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={classes}
            /* Prefetch so the sibling view is instant — the indicator must
               never slide onto a screen that is still loading. */
            prefetch
          >
            {inner}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.value)}
            className={classes}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
