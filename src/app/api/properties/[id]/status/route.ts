import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const body = z.object({
  status: z.enum(["available","negotiating","token","sold","rented","leased","parked","withdrawn"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try { parsed = body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  const { error } = await supabase
    .from("properties")
    .update({ status: parsed.status })
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
