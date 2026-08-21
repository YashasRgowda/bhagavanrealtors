import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";

const ACCEPTED = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per document scan

const body = z.object({
  stage: z.string().min(1).max(40),
  field: z.string().min(1).max(60),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try { parsed = body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  if (!ACCEPTED.includes(parsed.contentType)) {
    return NextResponse.json({ error: `Unsupported file type: ${parsed.contentType}` }, { status: 415 });
  }
  if (parsed.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id, property_id, owner_user_id")
    .eq("id", id)
    .single();
  if (!deal || deal.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const storage = getStorage();
  const safe = parsed.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const scopedName = `deal-docs__${parsed.stage}__${parsed.field}__${safe}`;
  const target = await storage.createSignedUpload({
    userId: user.id,
    propertyId: deal.property_id,
    filename: scopedName,
    contentType: parsed.contentType,
  });
  return NextResponse.json(target);
}
