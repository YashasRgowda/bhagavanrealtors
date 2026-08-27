"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { DUR, EASE_IN, EASE_OUT, SPRING_SOFT, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * One surface, two behaviours:
 *   • phone   — bottom sheet springing up, backdrop fade, app shell recedes
 *   • desktop — centred dialog, scale 0.96 → 1
 *
 * Built on Radix Dialog so focus trapping, focus restore, Escape, scroll lock
 * and the aria wiring are correct by construction; motion only supplies the
 * presence animation via `forceMount`.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  footer,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const m = useMotionPrefs();

  // Drives the app-shell scale-down. Cleared on unmount so an interrupted
  // close can never leave the page stuck at 98%.
  React.useEffect(() => {
    if (!open) return;
    document.body.dataset.sheetOpen = "true";
    return () => { delete document.body.dataset.sheetOpen; };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE_OUT }}
                className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              forceMount
              /* Radix focuses the first tabbable node, which is the close
                 button — a ring around an X is a poor first thing to land on.
                 Focus the panel instead: screen readers still announce the
                 title, and Tab moves into the controls in order. */
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement | null)?.focus?.();
              }}
            >
              <motion.div
                tabIndex={-1}
                initial={m.animate ? { opacity: 0, y: "100%" } : { opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  m.animate
                    ? { opacity: 0, y: "100%", transition: { duration: DUR.base, ease: EASE_IN } }
                    : { opacity: 0, transition: { duration: DUR.micro } }
                }
                transition={SPRING_SOFT}
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-sheet flex-col",
                  "rounded-t-xl border border-line bg-elevated shadow-xl",
                  /* Desktop: a centred dialog instead of a bottom sheet. */
                  "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-dialog sm:w-full sm:max-w-lg",
                  "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
                  className,
                )}
              >
                {/* Grab handle — signals "drag me" and gives the thumb a target. */}
                <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
                  <span className="h-1 w-9 rounded-full bg-line-strong" />
                </div>

                <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-4">
                  <div className="min-w-0">
                    <Dialog.Title className="text-h3">{title}</Dialog.Title>
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-ink-muted">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className={cn(
                      "-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-md",
                      "text-ink-muted transition-colors duration-160",
                      "hover:bg-inset hover:text-ink",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

                {footer && (
                  <div className="shrink-0 border-t border-line bg-subtle px-5 py-4 pb-safe sm:pb-4">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
