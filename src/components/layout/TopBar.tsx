import Link from "next/link";
import { LogOut } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { TopNav } from "./TopNav";

/**
 * App header: identity, destinations, sign out.
 *
 * The nav sits directly against the brand behind a hairline divider rather
 * than floating in the centre — that alignment is what makes a bar read as
 * structure. Creating a property is a page action, not a header one, so it
 * lives on the page below.
 */
export async function TopBar() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? (await supabase.from("profiles").select("brand_name, full_name").eq("id", user.id).single()).data
    : null;
  const name = profile?.brand_name || profile?.full_name || "Bhagvan Realtors";
  const initial = name.trim().slice(0, 1).toUpperCase() || "B";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex h-16 max-w-320 items-center px-4 sm:px-6 lg:px-8">
        {/* ── Identity ── */}
        <Link
          href="/properties"
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-h3 leading-none text-accent-fg">
            {initial}
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-sm font-semibold tracking-snug text-ink">{name}</span>
            <span className="mt-1 truncate text-nav uppercase text-ink-subtle">
              Property Desk
            </span>
          </span>
        </Link>

        <span className="mx-4 hidden h-6 w-px shrink-0 bg-line md:block" aria-hidden />

        {/* ── Destinations ── */}
        <TopNav />

        {/* ── Sign out ── */}
        <form action="/api/auth/signout" method="post" className="ml-auto shrink-0 pl-4">
          <button
            className={cn(
              "flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink-muted",
              "transition-colors duration-160 ease-out-expo hover:bg-inset hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
            aria-label="Sign out"
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
