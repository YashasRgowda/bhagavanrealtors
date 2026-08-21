import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * "Vacant again / Re-list": close the open tenancy (set end_date if missing)
 * and flip the property back to `available`.
 */
export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop } = await supabase
    .from("properties")
    .select("id, owner_user_id, status")
    .eq("id", id)
    .single();
  if (!prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Close the most recent open tenancy (end_date is null)
  const { data: open } = await supabase
    .from("tenancy_history")
    .select("id, end_date")
    .eq("property_id", id)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) {
    await supabase
      .from("tenancy_history")
      .update({ end_date: today })
      .eq("id", open.id);
  }

  const { error } = await supabase
    .from("properties")
    .update({ status: "available" })
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
