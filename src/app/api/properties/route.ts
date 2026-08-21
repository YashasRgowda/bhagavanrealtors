import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPropertyInput } from "@/lib/validation/property";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = createPropertyInput.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid input", details: String(e) }, { status: 400 });
  }

  const { contact, ...propFields } = body;

  const insert = {
    owner_user_id: user.id,
    ...propFields,
    attributes: propFields.attributes ?? {},
    status: "available" as const,
  };

  const { data: inserted, error } = await supabase
    .from("properties")
    .insert(insert)
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  if (contact && Object.values(contact).some(v => v !== null && v !== undefined && v !== "")) {
    await supabase.from("property_contacts").upsert({
      property_id: inserted.id,
      owner_user_id: user.id,
      ...contact,
    });
  }

  return NextResponse.json({ id: inserted.id });
}
