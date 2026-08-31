"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders children at <body>, escaping every ancestor stacking context.
 *
 * Necessary because these dialogs are triggered from inside the property
 * sidebar, which is `position: sticky` — and a sticky element creates its own
 * stacking context. A `z-50` overlay nested inside it still paints *below* the
 * `z-30` sticky top bar, which was covering the dialog's header.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/**
 * Modal shell used by every dialog in the app.
 *
 * Scroll behaviour matters here: the previous dialogs centred a tall card
 * inside a `overflow-y-auto` flex container, which silently makes the top of
 * the card unreachable — a flex item centred in an overflowing container
 * overflows equally in both directions, but you can only ever scroll *down*.
 * Instead the card is height-capped and scrolls its own body, so the header
 * and the action footer stay pinned and visible at any content length.
 */
export function Modal({
  onClose,
  eyebrow,
  title,
  description,
  icon,
  footer,
  size = "md",
  children,
  labelledBy = "modal-title",
  role = "dialog",
}: {
  onClose: () => void;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  labelledBy?: string;
  role?: "dialog" | "alertdialog";
}) {
  // Escape to close + lock the page behind the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-6xl" }[size];

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-[#0a0a0a]/45 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={e => e.stopPropagation()}
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl",
          "border border-border bg-card shadow-xl animate-scale-in",
          width,
        )}
      >
        {/* ── Header (pinned) ── */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-start gap-3.5">
            {icon}
            <div className="min-w-0">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2
                id={labelledBy}
                className={cn("font-display leading-tight", eyebrow ? "mt-2 text-2xl" : "text-xl")}
              >
                {title}
              </h2>
              {description && (
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body (the only thing that scrolls) ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {/* ── Footer (pinned) ── */}
          {footer && (
            <div className="shrink-0 border-t border-border bg-muted/40 px-6 py-4">{footer}</div>
          )}
        </div>
      </div>
    </Portal>
  );
}

/** Numbered section heading used inside multi-step dialogs. */
export function ModalStep({
  n,
  title,
  aside,
  children,
}: {
  n: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foreground text-[0.625rem] font-semibold text-background">
          {n}
        </span>
        <h3 className="eyebrow">{title}</h3>
        {aside && <span className="ml-auto text-[0.6875rem] text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
