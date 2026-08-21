import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[84px] w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm leading-relaxed text-foreground shadow-2xs",
        "transition-[border-color,box-shadow] duration-200",
        "placeholder:text-faint",
        "hover:border-border-strong",
        "focus:border-foreground focus:outline-none focus:ring-[3px] focus:ring-foreground/8",
        "focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
