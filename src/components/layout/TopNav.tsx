"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { SPRING, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";

const items = [
  { href: "/properties",        label: "Live"     },
  { href: "/requirements",      label: "Buyers"   },
  { href: "/properties/parked", label: "Archive"  },
  { href: "/settings",          label: "Settings" },
];

/**
 * Desktop navigation.
 *
 * The active marker is a rule sitting on the header's own bottom border, so
 * the nav reads as part of the bar rather than as a control floating inside
 * it — which is what made the previous centred pill feel bolted on.
 */
export function TopNav() {
  const pathname = usePathname();
  const m = useMotionPrefs();

  return (
    <nav aria-label="Main" className="hidden h-full md:block">
      <ul className="flex h-full items-stretch">
        {items.map(({ href, label }) => {
          const active =
            href === "/properties"
              ? pathname === "/properties"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="relative flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center px-4 text-sm font-medium",
                  "transition-colors duration-160 ease-out-expo",
                  "focus-visible:outline-2 focus-visible:focus-inset focus-visible:outline-ring",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
              {active && (
                <motion.span
                  layoutId={m.animate ? "top-nav-underline" : undefined}
                  transition={SPRING}
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
