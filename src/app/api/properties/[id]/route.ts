import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPropertyInput } from "@/lib/validation/property";
import { getStorage } from "@/lib/storage";

/**
 * PATCH /api/properties/[id] — update a property + its owner contact row.
 *
 * Used by the wizard when the user hits "Save & add photos" again after coming
 * back from the Photos step — we already created the property on the first save,
 * so this call just updates the existing row instead of inserting a duplicate.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = createPropertyInput.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid input", details: String(e) }, { status: 400 });
  }

  // Confirm ownership before touching anything.
  const { data: existing } = await supabase
    .from("properties")
    .select("id, owner_user_id")
    .eq("id", id)
    .single();
  if (!existing || existing.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { contact, ...propFields } = body;

  const { error: pErr } = await supabase
    .from("properties")
    .update({
      ...propFields,
      attributes: propFields.attributes ?? {},
    })
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  if (contact) {
    const hasAny = Object.values(contact).some(v => v !== null && v !== undefined && v !== "");
    if (hasAny) {
      await supabase.from("property_contacts").upsert({
        property_id: id,
        owner_user_id: user.id,
        ...contact,
      });
    }
  }

  return NextResponse.json({ id });
}

/**
 * DELETE /api/properties/[id] — permanently erase a listing.
 *
 * Removes, with no recovery path:
 *   • the property row — which cascades to property_media, property_contacts,
 *     deals, tenancy_history and share_events (every child table declares
 *     `on delete cascade`), so share links die immediately;
 *   • every file under `{ownerId}/{propertyId}/` in storage — photos,
 *     thumbnails, videos AND deal-document scans, since deal uploads reuse the
 *     same prefix.
 *
 * Storage is swept BEFORE the row is dropped: the prefix is derived from the
 * owner and property ids, so a failure here leaves the listing intact and
 * retryable rather than stranding files we can no longer find.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("properties")
    .select("id, owner_user_id")
    .eq("id", id)
    .single();
  if (!existing || existing.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let filesDeleted = 0;
  try {
    filesDeleted = await getStorage().removePrefix(`${user.id}/${id}`);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Couldn't delete the photos and files, so the listing was left untouched. Please try again.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, filesDeleted });
}
