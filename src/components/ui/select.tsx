import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md border border-line bg-elevated px-3 text-ink shadow-sm",
      "transition-[border-color,box-shadow] duration-160 ease-out-expo",
      "hover:border-line-strong",
      "focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15",
      "focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:bg-inset disabled:opacity-60",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
