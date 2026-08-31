import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/properties/[id]/poster-image?m=<mediaId>
 *
 * Streams a property photo back from *our* origin.
 *
 * The poster is drawn on a <canvas>, and a canvas that has drawn a
 * cross-origin image becomes "tainted" — toBlob()/toDataURL() then throw a
 * SecurityError and the download silently dies. Supabase Storage lives on a
 * different origin, so we proxy the bytes through here to keep the canvas
 * clean. Same reason we can't just point an <img> at the public URL.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const mediaId = new URL(req.url).searchParams.get("m");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership is enforced through the property, not just the media row.
  const { data: prop } = await supabase
    .from("properties").select("id, owner_user_id").eq("id", id).single();
  if (!prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Without an explicit `m`, fall back to the cover photo as before. With one,
  // serve whatever that media row is — the poster studio also pulls a frame out
  // of a video, and that needs the bytes to come from our own origin so the
  // canvas stays exportable.
  let query = supabase
    .from("property_media")
    .select("url, type, is_cover, sort_order")
    .eq("property_id", id);
  if (mediaId) query = query.eq("id", mediaId);
  else query = query.eq("type", "image");

  const { data: rows } = await query.order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(1);
  const media = rows?.[0];
  if (!media?.url) return NextResponse.json({ error: "No photo" }, { status: 404 });

  const upstream = await fetch(media.url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Could not load photo" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/webp",
      // Range support lets a <video> seek to the frame we want.
      "accept-ranges": upstream.headers.get("accept-ranges") ?? "none",
      // Private: the URL is behind auth, so never let a shared cache hold it.
      "cache-control": "private, max-age=300",
    },
  });
}
