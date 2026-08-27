import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Empty and error states are designed screens, not fallbacks. Every one gets
 * an icon, one plain sentence of guidance, and — where there is something to
 * do — exactly one primary action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "empty",
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "empty" | "error";
  className?: string;
}) {
  const isError = tone === "error";
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed px-6 py-16 text-center",
        isError ? "border-danger/35 bg-danger-subtle/40" : "border-line-strong bg-elevated",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto grid size-14 place-items-center rounded-full",
          isError ? "bg-danger text-on-solid" : "bg-accent text-accent-fg",
        )}
      >
        {icon}
      </div>
      <h2 className="mt-6 text-h2 text-balance">{title}</h2>
      {description && (
        <p className="mx-auto mt-3 max-w-sm text-pretty text-sm text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </div>
  );
}
