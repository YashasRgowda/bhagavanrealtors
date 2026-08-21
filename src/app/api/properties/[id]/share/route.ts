import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const body = z.object({
  preset: z.enum(["teaser", "serious", "full", "custom"]),
  fields: z.record(z.string(), z.boolean()),
  media_ids: z.array(z.string().uuid()).default([]),
  hide_owner: z.boolean().default(true),
  hide_address: z.boolean().default(true),
  expires_in_days: z.number().int().min(1).max(365).nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try { parsed = body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  // Confirm ownership of the property.
  const { data: prop } = await supabase
    .from("properties").select("id, owner_user_id").eq("id", id).single();
  if (!prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = nanoid(14); // e.g. "V1StGXR8_Z5jdH"
  const expires_at = parsed.expires_in_days
    ? new Date(Date.now() + parsed.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: inserted, error } = await supabase
    .from("share_events")
    .insert({
      property_id: id,
      owner_user_id: user.id,
      token,
      preset: parsed.preset,
      fields: parsed.fields,
      media_ids: parsed.media_ids,
      hide_owner: parsed.hide_owner,
      hide_address: parsed.hide_address,
      expires_at,
    })
    .select("id, token")
    .single();
  if (error || !inserted) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return NextResponse.json({
    id: inserted.id,
    token: inserted.token,
    url: `${appUrl}/share/${inserted.token}`,
  });
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("share_events")
    .select("id, token, preset, hide_owner, hide_address, view_count, expires_at, revoked_at, created_at")
    .eq("property_id", id)
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ shares: data ?? [] });
}
