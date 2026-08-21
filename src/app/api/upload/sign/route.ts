import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";
import { MEDIA_LIMITS } from "@/lib/media/limits";

const bodySchema = z.object({
  propertyId: z.string().uuid(),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1),
  kind: z.enum(["image", "video"]),
  size: z.number().int().positive(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 });
  }

  // Server-side ceilings so nobody bypasses the browser check.
  const limit = parsed.kind === "image" ? MEDIA_LIMITS.image.maxBytes : MEDIA_LIMITS.video.maxBytes;
  if (parsed.size > limit) {
    return NextResponse.json({ error: `${parsed.kind} exceeds size limit` }, { status: 413 });
  }
  const accept = (parsed.kind === "image" ? MEDIA_LIMITS.image.accept : MEDIA_LIMITS.video.accept) as readonly string[];
  if (!accept.includes(parsed.contentType)) {
    return NextResponse.json({ error: `Unsupported content-type: ${parsed.contentType}` }, { status: 415 });
  }

  // Enforce property ownership.
  const { data: prop, error: propErr } = await supabase
    .from("properties")
    .select("id, owner_user_id")
    .eq("id", parsed.propertyId)
    .single();
  if (propErr || !prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const storage = getStorage();
  const target = await storage.createSignedUpload({
    userId: user.id,
    propertyId: parsed.propertyId,
    filename: parsed.filename,
    contentType: parsed.contentType,
  });
  return NextResponse.json(target);
}
