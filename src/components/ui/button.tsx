import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "text-sm font-medium tracking-[-0.01em]",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
    "active:translate-y-px",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Ink — the one emphatic action on a screen */
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-[#242422] hover:shadow-sm",
        /* Quiet fill for secondary actions */
        secondary:
          "bg-muted text-foreground hover:bg-[#ebebe7]",
        /* Hairline outline — the workhorse */
        outline:
          "border border-border-strong bg-card text-foreground shadow-2xs hover:border-foreground hover:bg-card",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger:
          "bg-[color:var(--danger)] text-white shadow-xs hover:brightness-110",
        link:
          "text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-12 rounded-lg px-7 text-[0.9375rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
