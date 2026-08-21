import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateClose } from "@/lib/deal/validation";
import type { DealRow } from "@/lib/deal/types";

/**
 * Close a deal → mark the property SOLD.
 * Blocks with a 422 + the exact list of missing mandatory fields if the deal
 * isn't ready. This is the ONLY path that sets a property to "sold".
 */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: deal, error: gErr } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .single();
  if (gErr || !deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!deal.is_active) return NextResponse.json({ error: "This deal is already closed" }, { status: 400 });

  const { ok, missing } = validateClose(deal as Pick<DealRow, "steps" | "agreed_amount">);
  if (!ok) {
    return NextResponse.json(
      { error: "Deal is not complete", missing },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();
  const possession = (deal.steps?.possession?.values ?? {}) as Record<string, unknown>;

  const { error: dErr } = await supabase
    .from("deals")
    .update({
      is_active: false,
      closed_at: now,
      current_stage: "possession",
      brokerage_received: possession.brokerage_received ? Number(possession.brokerage_received) : deal.brokerage_received,
    })
    .eq("id", id);
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const { error: pErr } = await supabase
    .from("properties")
    .update({ status: "sold" })
    .eq("id", deal.property_id)
    .eq("owner_user_id", user.id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
