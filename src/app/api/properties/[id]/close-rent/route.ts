import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const body = z.object({
  tenant_name:  z.string().max(120).nullable().optional(),
  tenant_phone: z.string().max(20).nullable().optional(),
  rent_amount:  z.number().int().nonnegative().nullable().optional(),
  deposit:      z.number().int().nonnegative().nullable().optional(),
  lease_amount: z.number().int().nonnegative().nullable().optional(),
  start_date:   z.string().nullable().optional(),          // YYYY-MM-DD
  end_date:     z.string().nullable().optional(),
  notes:        z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop } = await supabase
    .from("properties")
    .select("id, owner_user_id, transaction_type, attributes")
    .eq("id", id)
    .single();
  if (!prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (prop.transaction_type === "sale") {
    return NextResponse.json({ error: "Not a rent/lease property" }, { status: 400 });
  }

  let payload;
  try { payload = body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  // Insert tenancy row
  const { error: tErr } = await supabase.from("tenancy_history").insert({
    property_id: id,
    owner_user_id: user.id,
    tenant_name: payload.tenant_name ?? null,
    tenant_phone: payload.tenant_phone ?? null,
    rent_amount: payload.rent_amount ?? null,
    deposit: payload.deposit ?? null,
    lease_amount: payload.lease_amount ?? null,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    notes: payload.notes ?? null,
  });
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Flip property to parked (keeps it in DB, drops it from Live)
  const closedStatus = prop.transaction_type === "lease" ? "leased" : "rented";
  const { error: pErr } = await supabase
    .from("properties")
    // MERGE, never replace: assigning a fresh object to a jsonb column
    // overwrites it, and this one holds every detail of the listing —
    // facing, furnishing, floor, parking, notice period. Marking a rental
    // rented was silently erasing all of it.
    .update({
      status: "parked",
      attributes: { ...(prop.attributes ?? {}), last_closed_as: closedStatus },
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
