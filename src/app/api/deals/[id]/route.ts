import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StageKey } from "@/lib/deal/stages";
import { buildCtx, isStageComplete } from "@/lib/deal/validation";
import type { DealRow } from "@/lib/deal/types";

// The client only ever sends values now — completeness ("done") is computed
// server-side from the mandatory-field rules. There is no manual "mark done".
const patchSchema = z.object({
  stage: z.string(),
  values: z.record(z.string(), z.unknown()).optional(),
  attachments: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = patchSchema.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  const { data: deal, error: gErr } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .single();
  if (gErr || !deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!deal.is_active) return NextResponse.json({ error: "This deal is already closed" }, { status: 400 });

  const stageKey = body.stage as StageKey;
  const existing = (deal.steps?.[stageKey] ?? { done: false, values: {} }) as {
    done: boolean;
    values: Record<string, unknown>;
    attachments?: string[];
  };
  const mergedValues = { ...existing.values, ...(body.values ?? {}) };

  const nextSteps = {
    ...(deal.steps ?? {}),
    [stageKey]: {
      done: false, // recomputed below
      values: mergedValues,
      attachments: body.attachments ?? existing.attachments ?? [],
      updated_at: new Date().toISOString(),
    },
  };

  // Recompute completeness for THIS stage from the mandatory-field rules.
  const dealForCtx = { steps: nextSteps, agreed_amount: deal.agreed_amount } as Pick<DealRow, "steps" | "agreed_amount">;
  const dealCtx = buildCtx(dealForCtx);
  nextSteps[stageKey].done = isStageComplete(stageKey, mergedValues, dealCtx);

  const patch: Record<string, unknown> = {
    steps: nextSteps,
    current_stage: stageKey,
    updated_at: new Date().toISOString(),
  };
  if (stageKey === "buyer_found") {
    if (mergedValues.buyer_name)   patch.buyer_name = mergedValues.buyer_name;
    if (mergedValues.buyer_phone)  patch.buyer_phone = mergedValues.buyer_phone;
    if (mergedValues.agreed_price) patch.agreed_amount = Number(mergedValues.agreed_price);
  }
  if (stageKey === "possession" && mergedValues.brokerage_received) {
    patch.brokerage_received = Number(mergedValues.brokerage_received);
  }

  const { error: uErr } = await supabase.from("deals").update(patch).eq("id", id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  // Auto-advance property status from data presence (never to "sold" — that's the close action).
  const bf = (nextSteps.buyer_found?.values ?? {}) as Record<string, unknown>;
  const tok = (nextSteps.token?.values ?? {}) as Record<string, unknown>;
  let newStatus: "available" | "negotiating" | "token" | null = null;
  if (tok.amount && Number(tok.amount) > 0 && tok.date) {
    newStatus = "token";
  } else if (bf.buyer_name && bf.agreed_price && Number(bf.agreed_price) > 0) {
    newStatus = "negotiating";
  }
  if (newStatus) {
    // Only move forward within the live states; never touch a closed property.
    const { data: prop } = await supabase
      .from("properties").select("status").eq("id", deal.property_id).single();
    const rank: Record<string, number> = { available: 0, negotiating: 1, token: 2 };
    if (prop && rank[prop.status] !== undefined && rank[newStatus] > rank[prop.status]) {
      await supabase
        .from("properties")
        .update({ status: newStatus })
        .eq("id", deal.property_id)
        .eq("owner_user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
