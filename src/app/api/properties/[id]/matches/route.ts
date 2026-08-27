import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buyersFor, type MatchProperty, type MatchRequirement } from "@/lib/match/engine";

/**
 * GET /api/properties/[id]/matches
 * Buyers waiting for this property. Used by the wizard's final step so the
 * dealer sees "N buyers have been waiting for exactly this" the moment they
 * finish adding it.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prop } = await supabase
    .from("properties").select("*").eq("id", id).single();
  if (!prop || prop.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: reqs } = await supabase
    .from("requirements").select("*").eq("status", "active");

  const { matches, needsCheck } = buyersFor(
    prop as MatchProperty,
    ((reqs ?? []) as MatchRequirement[]),
  );

  return NextResponse.json({
    matches: matches.map(({ requirement, result }) => ({
      id: requirement.id,
      buyer_name: requirement.buyer_name,
      buyer_phone: (requirement as unknown as { buyer_phone: string | null }).buyer_phone ?? null,
      reasons: result.reasons,
    })),
    needsCheckCount: needsCheck.length,
  });
}
