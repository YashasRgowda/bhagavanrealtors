import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { metresBetween } from "@/lib/geo/haversine";

const body = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  radiusMetres: z.number().int().min(1).max(1000).default(50),
  excludePropertyId: z.string().uuid().nullable().optional(),
});

/**
 * Return any of this owner's existing properties whose GPS is within
 * `radiusMetres` (default 50 m) of the given lat/lng. Coarse pre-filter in SQL
 * by lat/lng bounding box, then exact haversine distance in JS.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try { parsed = body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  // 1° latitude ≈ 111km, so radius/111000 degrees; longitude scales by cos(lat).
  const dLat = parsed.radiusMetres / 111_000;
  const dLng = parsed.radiusMetres / (111_000 * Math.cos((parsed.lat * Math.PI) / 180));

  let q = supabase
    .from("properties")
    .select("id, title, locality, status, latitude, longitude, transaction_type")
    .eq("owner_user_id", user.id)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("latitude", parsed.lat - dLat)
    .lte("latitude", parsed.lat + dLat)
    .gte("longitude", parsed.lng - dLng)
    .lte("longitude", parsed.lng + dLng)
    .limit(20);
  if (parsed.excludePropertyId) q = q.neq("id", parsed.excludePropertyId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nearby = (data ?? [])
    .map(row => ({
      ...row,
      distance_m: Math.round(metresBetween(
        { lat: parsed.lat, lng: parsed.lng },
        { lat: row.latitude as number, lng: row.longitude as number },
      )),
    }))
    .filter(r => r.distance_m <= parsed.radiusMetres)
    .sort((a, b) => a.distance_m - b.distance_m);

  return NextResponse.json({ nearby });
}
