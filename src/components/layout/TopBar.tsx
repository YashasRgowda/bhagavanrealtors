import Link from "next/link";
import { LogOut } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TopNav } from "./TopNav";

export async function TopBar() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? (await supabase.from("profiles").select("brand_name, full_name").eq("id", user.id).single()).data
    : null;
  const name = profile?.brand_name || profile?.full_name || "Bhagvan Realtors";
  const initial = name.trim().slice(0, 1).toUpperCase() || "B";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        {/* Brand mark */}
        <Link href="/properties" className="group flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary font-display text-[1.0625rem] leading-none text-primary-foreground">
            {initial}
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-display text-[1.0625rem] leading-tight">{name}</span>
            <span className="mt-1 hidden text-[0.5625rem] font-medium uppercase tracking-[0.18em] text-faint sm:block">
              Property Desk
            </span>
          </span>
        </Link>

        <TopNav />

        <form action="/api/auth/signout" method="post" className="shrink-0">
          <button
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </form>
      </div>
    </header>
  );
}
