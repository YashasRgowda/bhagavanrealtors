import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSellerValuesFromContact } from "@/lib/deal/prefill";

// GET → return the active deal for this property (or null)
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("property_id", id)
    .eq("owner_user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ deal: data ?? null });
}

// POST → create a new active deal for this property (or return the existing one)
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop, error: pErr } = await supabase
    .from("properties")
    .select("id, owner_user_id, transaction_type, status")
    .eq("id", id)
    .single();
  if (pErr || !prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (prop.transaction_type !== "sale") {
    return NextResponse.json({ error: "Deals only apply to sale properties" }, { status: 400 });
  }
  if (prop.status === "sold" || prop.status === "withdrawn") {
    return NextResponse.json({ error: "This property is already closed" }, { status: 400 });
  }

  // Only reuse an ACTIVE deal — a closed deal is history and shouldn't be resurrected.
  const { data: existingActive } = await supabase
    .from("deals")
    .select("id")
    .eq("property_id", id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingActive) return NextResponse.json({ id: existingActive.id });

  // Prefill the seller_info stage from every matching field on the owner record.
  //   Anything the dealer already filled at listing time carries through.
  const { data: contact } = await supabase
    .from("property_contacts")
    .select("*")
    .eq("property_id", id)
    .maybeSingle();

  const initialSteps: Record<string, unknown> = {};
  const sellerValues = buildSellerValuesFromContact(contact);
  if (Object.keys(sellerValues).length > 1) {  // >1 because _prefilled_from_owner is always there when we prefill
    initialSteps.seller_info = { done: false, values: sellerValues };
  }

  const { data: inserted, error } = await supabase
    .from("deals")
    .insert({
      property_id: id,
      owner_user_id: user.id,
      deal_type: "sale",
      current_stage: "buyer_found",
      steps: initialSteps,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });

  return NextResponse.json({ id: inserted.id });
}
