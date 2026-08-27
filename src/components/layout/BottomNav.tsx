"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, Plus, Archive, User, UserSearch } from "lucide-react";
import { SPRING, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";

const items = [
  { href: "/properties",        label: "Live",    icon: Home       },
  { href: "/properties/new",    label: "Add",     icon: Plus       },
  { href: "/requirements",      label: "Buyers",  icon: UserSearch },
  { href: "/properties/parked", label: "Archive", icon: Archive    },
  { href: "/settings",          label: "Me",      icon: User       },
];

/**
 * Mobile navigation.
 *
 * Sized to `--nav-h` exactly, so anything pinned above it (the wizard's action
 * bar) can offset by a known amount instead of a guess. Five items across a
 * 344px Fold cover screen leaves 68px per column, which is why the label uses
 * `text-nav` (10px) rather than `text-xs` — "ARCHIVE" has to fit without
 * truncating at the narrowest width we support.
 */
export function BottomNav() {
  const pathname = usePathname();
  const m = useMotionPrefs();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elevated/95 backdrop-blur-xl pb-safe md:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-md items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/properties"
              ? pathname === "/properties"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex size-full flex-col items-center justify-center gap-1",
                  "transition-colors duration-160 ease-out-expo",
                  "focus-visible:outline-2 focus-visible:focus-inset focus-visible:outline-ring",
                  active ? "text-accent-text" : "text-ink-subtle",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={m.animate ? "bottom-nav-indicator" : undefined}
                    transition={SPRING}
                    className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn("size-5 shrink-0", active && "stroke-active")}
                  aria-hidden
                />
                <span className="max-w-full truncate text-nav uppercase">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
