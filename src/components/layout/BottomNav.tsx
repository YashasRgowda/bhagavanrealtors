"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Archive, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/properties",         label: "Live",    icon: Home    },
  { href: "/properties/new",     label: "Add",     icon: Plus    },
  { href: "/properties/parked",  label: "Archive", icon: Archive },
  { href: "/settings",           label: "Me",      icon: User    },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl pb-safe md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/properties"
              ? pathname === "/properties"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 pb-2 pt-2.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] transition-colors duration-200",
                  active ? "text-foreground" : "text-faint",
                )}
              >
                {/* Tab indicator */}
                <span
                  className={cn(
                    "absolute inset-x-0 top-0 mx-auto h-[2px] w-8 rounded-full transition-colors duration-200",
                    active ? "bg-foreground" : "bg-transparent",
                  )}
                />
                <Icon className={cn("h-[1.125rem] w-[1.125rem]", active && "stroke-[2.25]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
