import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button.
 *
 * Deliberately a plain <button> with CSS transitions rather than a motion
 * component: press feedback is a single transform the compositor handles for
 * free, and keeping it server-renderable means it costs nothing in the bundle.
 *
 * Touch targets: `md` (44px) is the mobile default. `sm` (36px) is desktop-only
 * density and must not carry a primary action on a phone.
 */
const button = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium select-none",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-160 ease-out-expo",
    "active:scale-97",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /* The one emphatic action on a screen. */
        primary:
          "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover hover:shadow-md",
        /* Quiet fill — secondary actions that still need presence. */
        secondary:
          "bg-inset text-ink hover:bg-hover",
        /* Hairline outline — the workhorse. */
        outline:
          "border border-line bg-elevated text-ink shadow-sm hover:border-line-strong hover:bg-subtle",
        ghost:
          "text-ink-muted hover:bg-inset hover:text-ink",
        destructive:
          "bg-danger text-on-solid shadow-sm hover:brightness-110",
        /* Destructive but low-commitment — used before a confirm step. */
        "destructive-ghost":
          "text-danger-text hover:bg-danger-subtle",
        link:
          "text-accent-text underline decoration-accent-line underline-offset-4 hover:decoration-accent",
        /* Legacy aliases — un-migrated screens still pass these. Removed in step 7. */
        default:
          "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover hover:shadow-md",
        danger:
          "bg-danger text-on-solid shadow-sm hover:brightness-110",
      },
      size: {
        sm:   "h-9 pointer-coarse:h-11 rounded-md px-3 text-xs [&_svg]:size-4",
        md:   "h-11 rounded-md px-4 text-sm [&_svg]:size-5",
        lg:   "h-12 rounded-md px-6 text-body [&_svg]:size-5",
        icon: "size-11 rounded-md [&_svg]:size-5",
        /* Legacy alias. Removed in step 7. */
        default: "h-11 rounded-md px-4 text-sm [&_svg]:size-5",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  /** Swaps the label for a spinner without changing the button's width. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* Label stays in flow so the box never resizes mid-request. */}
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-opacity duration-120 ease-out-expo",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </span>
      )}
    </button>
  ),
);
Button.displayName = "Button";

export { button as buttonVariants };
