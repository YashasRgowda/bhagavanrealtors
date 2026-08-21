import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  type: z.enum(["image", "video"]),
  storage_path: z.string(),
  url: z.string().url(),
  thumb_url: z.string().url().nullable().optional(),
  bytes: z.number().int().positive().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_cover: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop } = await supabase
    .from("properties")
    .select("id, owner_user_id")
    .eq("id", id)
    .single();
  if (!prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try { body = bodySchema.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Invalid input", details: String(e) }, { status: 400 }); }

  const { data, error } = await supabase
    .from("property_media")
    .insert({
      property_id: id,
      owner_user_id: user.id,
      ...body,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data!.id });
}
