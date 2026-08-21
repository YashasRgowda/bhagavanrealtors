import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogOut, Store, Phone, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your brand details appear on every listing you share with a buyer."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="eyebrow">Signed in</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border border-t border-border p-0">
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email ?? "—"} />
          <Row
            icon={<Store className="h-4 w-4" />}
            label="Brand name"
            value={profile?.brand_name || "Not set"}
            muted={!profile?.brand_name}
          />
          <Row
            icon={<Phone className="h-4 w-4" />}
            label="Contact shown on shares"
            value={profile?.brand_phone || "Not set"}
            muted={!profile?.brand_phone}
          />
        </CardContent>
      </Card>

      {!profile?.brand_name && (
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-3.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
          Set your brand name &amp; phone in Supabase → Table Editor → <code className="font-mono text-xs">profiles</code>.
          Those become the only contact details on shared listings — the owner&apos;s number is never exposed.
        </p>
      )}

      <div className="rule-fade" />

      <form action="/api/auth/signout" method="post">
        <Button variant="outline" size="lg" className="w-full">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </form>
    </div>
  );
}

function Row({
  icon, label, value, muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="flex items-center gap-2.5 text-[0.8125rem] text-muted-foreground">
        <span className="text-faint">{icon}</span>
        {label}
      </span>
      <span className={`truncate text-sm font-medium ${muted ? "text-faint" : ""}`}>{value}</span>
    </div>
  );
}
