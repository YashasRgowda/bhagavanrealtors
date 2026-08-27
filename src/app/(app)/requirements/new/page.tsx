import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequirementForm } from "@/components/requirement/RequirementForm";
import { ArrowLeft } from "lucide-react";

export default function NewRequirementPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <Link href="/requirements" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Requirements
      </Link>
      <PageHeader
        eyebrow="New requirement"
        title="Add a buyer"
        description="Write down what they're looking for. Every new property is checked against it automatically."
      />
      <RequirementForm />
    </div>
  );
}
