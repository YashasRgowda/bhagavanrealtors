import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStorage } from "@/lib/storage";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "property-media";

/**
 * Thumbnails are uploaded as their own object but we only persist their public
 * URL, not their storage path. Recover the path so deleting a photo doesn't
 * strand its thumbnail in the bucket forever.
 */
function pathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]) || null;
}

/** Shared ownership guard: the property must exist and belong to the caller. */
async function authorize(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: prop } = await supabase
    .from("properties").select("id, owner_user_id").eq("id", id).single();
  if (!prop || prop.owner_user_id !== user.id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { supabase, userId: user.id };
}

/**
 * DELETE /api/properties/[id]/media/[mediaId]
 * Removes the DB row *and* the underlying files (original + thumbnail).
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; mediaId: string }> },
) {
  const { id, mediaId } = await ctx.params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const { supabase, userId } = auth;

  const { data: media } = await supabase
    .from("property_media")
    .select("id, storage_path, thumb_url, is_cover")
    .eq("id", mediaId)
    .eq("property_id", id)
    .single();
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Drop the row first — a stranded file is far less harmful than a row
  // pointing at a file that no longer exists.
  const { error: delErr } = await supabase
    .from("property_media")
    .delete()
    .eq("id", mediaId)
    .eq("owner_user_id", userId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const storage = getStorage();
  for (const path of [media.storage_path, pathFromPublicUrl(media.thumb_url)]) {
    if (!path) continue;
    // Never fail the request over a storage hiccup — the row is already gone.
    try { await storage.remove(path); } catch { /* orphaned file, non-fatal */ }
  }

  // If we just removed the cover, promote whatever is now first.
  if (media.is_cover) {
    const { data: next } = await supabase
      .from("property_media")
      .select("id")
      .eq("property_id", id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("property_media").update({ is_cover: true }).eq("id", next.id);
    }
  }

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({ is_cover: z.literal(true) });

/**
 * PATCH /api/properties/[id]/media/[mediaId] — make this item the cover.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; mediaId: string }> },
) {
  const { id, mediaId } = await ctx.params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const { supabase, userId } = auth;

  try { patchSchema.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Invalid input", details: String(e) }, { status: 400 }); }

  // Exactly one cover per property.
  await supabase
    .from("property_media")
    .update({ is_cover: false })
    .eq("property_id", id)
    .eq("owner_user_id", userId);

  const { error } = await supabase
    .from("property_media")
    .update({ is_cover: true })
    .eq("id", mediaId)
    .eq("property_id", id)
    .eq("owner_user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
