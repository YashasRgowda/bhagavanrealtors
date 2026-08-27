import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * Shared form building blocks.
 *
 * Tuned for the person actually filling these in: a dealer in his fifties,
 * often standing outside a building, in a hurry. That drives three choices —
 * every section announces itself with an icon and a plain-language sentence,
 * required fields are unmistakable, and optional detail is visibly demoted so
 * the eye can skip it without wondering whether it mattered.
 */

/* ───────────────────────── section card ───────────────────────── */

/**
 * A titled step of a form. Owns its own card, so sections read as separate
 * chapters instead of blurring into one long scroll behind hairline rules.
 */
export function FormCard({
  icon,
  title,
  description,
  aside,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  /** One plain sentence. Never jargon — this is the bit that gets read. */
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-elevated shadow-sm", className)}>
      <header className="flex items-start gap-3.5 border-b border-line p-5 sm:px-6">
        {icon && (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent-text [&_svg]:size-5"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-h3 text-ink">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {/* Blocks inside a card need real separation — without a gap the
          required row sits flush against the optional well below it. */}
      <div className="flex flex-col gap-7 p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** A titled block of fields *inside* a card. */
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
    <section className={cn("flex flex-col gap-4", className)}>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Optional extras, visibly demoted.
 *
 * Nothing is hidden — a dealer who wants to record the facing shouldn't have
 * to hunt for it — but the tinted well and quieter heading make it obvious at
 * a glance which fields he can skip and still save.
 */
export function FieldGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-line-subtle bg-subtle p-5", className)}>
      <p className="text-micro uppercase text-ink-muted">{title}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

/* ───────────────────────────── fields ───────────────────────────── */

/** Responsive field grid. Stacks below `xs` so a 344px screen never cramps. */
export function FormGrid({
  children,
  className,
  cols = 2,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-5 gap-y-7",
        cols === 3 ? "xs:grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Label + control + hint, with consistent spacing everywhere. */
export function Field({
  label,
  required,
  optional,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  /** Renders a quiet "optional" tag — use where skipping isn't obvious. */
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5">
        <span>{label}</span>
        {required && (
          <span className="text-danger-text" aria-hidden>*</span>
        )}
        {required && <span className="sr-only">(required)</span>}
        {optional && (
          <span className="text-xs font-normal text-ink-subtle">optional</span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-danger-text">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
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
        "flex min-h-14 cursor-pointer items-start gap-3 rounded-md border p-5",
        "transition-[background-color,border-color] duration-160 ease-out-expo",
        checked
          ? "border-accent bg-accent-subtle"
          : "border-line bg-elevated hover:border-line-strong hover:bg-subtle",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0"
      />
      <span className="min-w-0 leading-snug">
        <span className="text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger-text" aria-hidden>*</span>}
        </span>
        {hint && <span className="mt-1 block text-sm text-ink-muted">{hint}</span>}
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
        "animate-fade-up rounded-md border border-accent-line bg-accent-subtle/40 p-5",
        className,
      )}
    >
      <p className="text-micro mb-4 uppercase text-ink-muted">{title}</p>
      <FormGrid>{children}</FormGrid>
    </div>
  );
}
