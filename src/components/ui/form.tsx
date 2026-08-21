import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * Shared form building blocks so every form in the app — the add wizard, the
 * edit screen, the deal pipeline, the dialogs — reads the same way.
 */

/** A titled block of fields with a hairline rule under the heading. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="border-b border-border pb-3">
        <h3 className="eyebrow">{title}</h3>
        {description && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Responsive field grid. Fields opt into full width with `className="sm:col-span-2"`. */
export function FormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-4 sm:grid-cols-2", className)}>{children}</div>
  );
}

/** Label + control + hint, with consistent spacing everywhere. */
export function Field({
  label,
  required,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-[color:var(--danger)]">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-[color:var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * A checkbox presented as a full-width row rather than a cramped grid cell.
 * Controlled, so the checked state can restyle the whole row — which is what
 * makes a toggle read as "on" at a glance.
 */
export function ToggleRow({
  checked,
  onChange,
  label,
  hint,
  required,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all duration-200",
        checked
          ? "border-foreground bg-muted/50"
          : "border-border bg-card hover:border-foreground/30 hover:bg-muted/25",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-px h-[1.125rem] w-[1.125rem] shrink-0"
      />
      <span className="min-w-0 leading-snug">
        <span className="text-[0.8125rem] font-medium">
          {label}
          {required && <span className="ml-0.5 text-[color:var(--danger)]">*</span>}
        </span>
        {hint && (
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
        )}
      </span>
    </label>
  );
}

/**
 * Fields revealed by a toggle. Grouping them into their own panel — instead of
 * letting them flow into the parent grid — is what stops "Co-buyer name"
 * landing beside an unrelated field.
 */
export function RevealPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up rounded-lg border border-border bg-muted/30 p-4",
        className,
      )}
    >
      <p className="eyebrow mb-4">{title}</p>
      <FormGrid>{children}</FormGrid>
    </div>
  );
}
