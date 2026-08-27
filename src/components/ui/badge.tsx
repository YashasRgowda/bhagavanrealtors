import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-inset text-ink-muted",
        accent:  "bg-accent-subtle text-accent-text",
        success: "bg-success-subtle text-success-text",
        warning: "bg-warning-subtle text-warning-text",
        danger:  "bg-danger-subtle text-danger-text",
        info:    "bg-info-subtle text-info-text",
        outline: "border border-line bg-elevated text-ink-muted",
        /* On top of a photo — needs its own opaque plate. */
        overlay: "bg-elevated/92 text-ink shadow-sm backdrop-blur-sm",
      },
      size: {
        sm: "h-6 px-2 text-xs",
        md: "h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

/**
 * Legacy `variant` names, mapped onto tones so un-migrated screens keep
 * rendering. Removed in step 7 once every caller passes `tone`.
 */
const LEGACY_VARIANT = {
  default: "neutral",
  success: "accent",   // meant "live / available"
  warning: "warning",
  danger:  "danger",
  muted:   "neutral",
  outline: "outline",
} as const;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {
  /** @deprecated pass `tone` instead. */
  variant?: keyof typeof LEGACY_VARIANT;
}

export function Badge({ className, tone, size, variant, ...props }: BadgeProps) {
  const resolved = tone ?? (variant ? LEGACY_VARIANT[variant] : undefined);
  return <span className={cn(badge({ tone: resolved, size }), className)} {...props} />;
}

/* ───────────────────────────── status pills ───────────────────────────── */

type Tone = NonNullable<BadgeProps["tone"]>;

/**
 * Presentation-only mapping of a property status to a tone + dot colour.
 *
 * Lives here rather than in `lib/property/enums`, so the data layer keeps
 * owning the labels and this layer owns how they look.
 *
 * Live states carry colour; closed states recede — which is why "Sold" reads
 * as a quiet success rather than competing with "Available" for attention.
 * The two never appear in the same list (Live vs Archive), so there is no
 * risk of confusing the two greens.
 */
const STATUS_TONE: Record<string, { tone: Tone; dot: string }> = {
  available:   { tone: "accent",  dot: "bg-accent"  },
  negotiating: { tone: "warning", dot: "bg-warning" },
  token:       { tone: "info",    dot: "bg-info"    },
  sold:        { tone: "success", dot: "bg-success" },
  rented:      { tone: "success", dot: "bg-success" },
  leased:      { tone: "success", dot: "bg-success" },
  parked:      { tone: "neutral", dot: "bg-ink-subtle" },
  withdrawn:   { tone: "danger",  dot: "bg-danger"  },
};

export function StatusPill({
  status,
  label,
  onPhoto = false,
  size = "md",
  className,
}: {
  status: string;
  label: string;
  /** Renders on an opaque plate so it stays legible over a photo. */
  onPhoto?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = STATUS_TONE[status] ?? { tone: "neutral" as Tone, dot: "bg-ink-subtle" };
  return (
    <Badge tone={onPhoto ? "overlay" : meta.tone} size={size} className={className}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {label}
    </Badge>
  );
}
