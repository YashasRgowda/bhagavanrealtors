"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/properties";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ─── Brand panel ─── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0a0a0a] p-14 text-white lg:flex">
        {/* Faint architectural grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 65%)" }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-white font-display text-lg leading-none text-[#0a0a0a]">
            B
          </span>
          <span className="font-display text-xl">Bhagvan Realtors</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-white/45">
            Private property desk
          </p>
          <h1 className="mt-6 font-display text-[3.25rem] leading-[1.05] text-white">
            Every property.
            <br />
            Every deal.
            <br />
            <span className="text-white/50">One place.</span>
          </h1>
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-white/55">
            Your catalogue, your buyers, your paperwork — kept private, organised
            and ready to share in a single tap.
          </p>
        </div>

        <div className="relative flex items-center gap-2.5 text-xs text-white/40">
          <ShieldCheck className="h-4 w-4" />
          Owner contacts stay private. Always.
        </div>
      </aside>

      {/* ─── Form panel ─── */}
      <main className="flex items-center justify-center bg-background px-6 py-14">
        <div className="w-full max-w-[22rem] animate-fade-up">
          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary font-display text-lg leading-none text-primary-foreground">
              B
            </span>
            <span className="font-display text-xl">Bhagvan Realtors</span>
          </div>

          <p className="eyebrow">Welcome back</p>
          <h2 className="mt-3 font-display text-[2rem] leading-tight">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the credentials set up for your desk.
          </p>

          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {err && (
              <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
                {err}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
              {!busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="rule-fade my-9" />

          <p className="text-center text-xs leading-relaxed text-faint">
            Bhagvan Realtors · Private property manager
          </p>
        </div>
      </main>
    </div>
  );
}
