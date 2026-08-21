import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Monochrome badges. Status is conveyed by *treatment* — solid ink, hairline
 * outline, or soft grey — rather than by hue, so the palette stays black & white.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.625rem] font-semibold uppercase leading-none tracking-[0.09em]",
  {
    variants: {
      variant: {
        /* neutral chip */
        default: "bg-muted text-foreground",
        /* live / available — solid ink carries the most weight */
        success: "bg-foreground text-background shadow-2xs",
        /* in motion — hairline ring, ink text */
        warning: "border border-foreground/45 bg-card text-foreground",
        /* closed / archived — recedes */
        muted: "bg-muted text-muted-foreground",
        /* parked — lightest possible presence */
        outline: "border border-border-strong bg-card text-muted-foreground",
        /* the only colour in the system */
        danger: "border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/8 text-[color:var(--danger)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
