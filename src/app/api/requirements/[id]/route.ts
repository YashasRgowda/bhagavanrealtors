import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirementPatchInput } from "@/lib/validation/requirement";

async function authorize(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: row } = await supabase
    .from("requirements").select("id, owner_user_id").eq("id", id).single();
  if (!row || row.owner_user_id !== user.id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { supabase, userId: user.id };
}

/** PATCH /api/requirements/[id] — update a requirement. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const { supabase, userId } = auth;

  let body;
  try {
    body = requirementPatchInput.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid input", details: String(e) }, { status: 400 });
  }

  const { error } = await supabase
    .from("requirements")
    .update(body)
    .eq("id", id)
    .eq("owner_user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id });
}

/** DELETE /api/requirements/[id] — remove a requirement for good. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("requirements").delete().eq("id", id).eq("owner_user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
