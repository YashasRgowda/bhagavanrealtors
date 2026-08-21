import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Vercel cron target: `/api/cron/lease-reminders` (schedule in vercel.json).
 * Finds tenancies ending within the next 30 days and returns them.
 * Phase 4 will hook this to email / WhatsApp; for now it just surfaces the list.
 */
export async function GET(req: Request) {
  // Vercel cron sends a bearer token in `authorization`; check if configured.
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createSupabaseServiceClient();
  const today = new Date();
  const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const { data, error } = await sb
    .from("tenancy_history")
    .select("id, property_id, owner_user_id, tenant_name, tenant_phone, end_date, properties(title, locality)")
    .not("end_date", "is", null)
    .gte("end_date", iso(today))
    .lte("end_date", iso(in30));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ upcoming: data ?? [], count: data?.length ?? 0 });
}
