"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Archive, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/properties",        label: "Live",     icon: Home    },
  { href: "/properties/new",    label: "Add",      icon: Plus    },
  { href: "/properties/parked", label: "Archive",  icon: Archive },
  { href: "/settings",          label: "Settings", icon: User    },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-2xs">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/properties"
              ? pathname === "/properties"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-medium tracking-[-0.005em] transition-colors duration-200",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-[0.9375rem] w-[0.9375rem]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
