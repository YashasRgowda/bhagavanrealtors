import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 44px tall on mobile so it clears the minimum touch target, and 16px text so
 * iOS never zooms the viewport on focus. Both are set in globals.css at the
 * element level, which is why they don't need repeating per-instance.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-md border border-line bg-elevated px-3 text-ink shadow-sm",
      "transition-[border-color,box-shadow] duration-160 ease-out-expo",
      "placeholder:text-ink-subtle",
      "hover:border-line-strong",
      "focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15",
      "focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:bg-inset disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
