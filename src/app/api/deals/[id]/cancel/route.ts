import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const body = z.object({
  reason: z.string().max(500).nullable().optional(),
});

/**
 * Cancel an active deal:
 *  - deal.is_active → false, closed_at → now, cancellation_reason stored in steps._meta
 *  - property.status → available (if it was negotiating/token; leave alone otherwise)
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload;
  try { payload = body.parse(await req.json().catch(() => ({}))); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  const { data: deal, error: dErr } = await supabase
    .from("deals").select("*").eq("id", id).eq("owner_user_id", user.id).single();
  if (dErr || !deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!deal.is_active) return NextResponse.json({ error: "Deal is already closed" }, { status: 400 });

  const now = new Date().toISOString();
  const nextSteps = {
    ...(deal.steps ?? {}),
    _meta: {
      cancelled: true,
      cancelled_at: now,
      cancellation_reason: payload.reason ?? null,
    },
  };

  const { error: uErr } = await supabase
    .from("deals")
    .update({
      is_active: false,
      closed_at: now,
      current_stage: deal.current_stage ?? "buyer_found",
      steps: nextSteps,
    })
    .eq("id", id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  // Revert property status if it was mid-pipeline; leave sold/withdrawn/parked alone.
  const { data: prop } = await supabase
    .from("properties").select("status").eq("id", deal.property_id).single();
  if (prop && (prop.status === "negotiating" || prop.status === "token")) {
    await supabase
      .from("properties")
      .update({ status: "available" })
      .eq("id", deal.property_id)
      .eq("owner_user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
