import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One consistent page opening across the whole app: a small all-caps eyebrow,
 * a serif title, a quiet subtitle, and an optional action on the right.
 * Keeping this identical everywhere is what makes the flow feel considered.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="font-display text-[1.75rem] leading-[1.1] sm:text-[2.125rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
