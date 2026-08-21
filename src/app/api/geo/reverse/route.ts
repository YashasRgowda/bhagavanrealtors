import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGeoProvider } from "@/lib/geo";

const body = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try { parsed = body.parse(await req.json()); }
  catch (e) { return NextResponse.json({ error: "Bad request", details: String(e) }, { status: 400 }); }

  try {
    const provider = getGeoProvider();
    const result = await provider.reverseGeocode(parsed.lat, parsed.lng);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
