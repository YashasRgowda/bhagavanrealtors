import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditPropertyForm } from "@/components/property/EditPropertyForm";
import { PROPERTY_TYPES } from "@/lib/property/enums";
import { ArrowLeft } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: p } = await supabase.from("properties").select("*").eq("id", id).single();
  if (!p) notFound();
  const prop = p as PropertyRow;

  const { data: media = [] } = await supabase
    .from("property_media").select("*").eq("property_id", id).order("sort_order");
  const { data: contact } = await supabase
    .from("property_contacts").select("*").eq("property_id", id).maybeSingle();

  const typeLabel =
    (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
      .find(t => t.value === prop.property_type)?.label ?? prop.property_type;

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <Link
        href={`/properties/${id}`}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to property
      </Link>

      <PageHeader
        eyebrow="Edit listing"
        title={prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`}
        description="Change the price, details or owner contact, and manage the photos and video."
      />

      <EditPropertyForm
        prop={prop}
        contact={contact ?? null}
        media={(media ?? []) as PropertyMediaRow[]}
      />
    </div>
  );
}
