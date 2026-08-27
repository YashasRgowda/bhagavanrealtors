import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirementInput } from "@/lib/validation/requirement";

/** POST /api/requirements — add a buyer requirement. */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = requirementInput.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid input", details: String(e) }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("requirements")
    .insert({
      owner_user_id: user.id,
      ...body,
      categories:     body.categories     ?? [],
      property_types: body.property_types ?? [],
      localities:     body.localities     ?? [],
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
