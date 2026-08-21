import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-2xs",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-border-strong",
        "focus:border-foreground focus:outline-none focus:ring-[3px] focus:ring-foreground/8",
        "focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
