import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequirementForm } from "@/components/requirement/RequirementForm";
import { ArrowLeft } from "lucide-react";
import type { RequirementRow } from "@/lib/requirement/types";

export const dynamic = "force-dynamic";

export default async function EditRequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("requirements").select("*").eq("id", id).single();
  if (!data) notFound();
  const req = data as RequirementRow;

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <Link href={`/requirements/${id}`} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <PageHeader eyebrow="Edit requirement" title={req.buyer_name} />
      <RequirementForm existing={req} />
    </div>
  );
}
