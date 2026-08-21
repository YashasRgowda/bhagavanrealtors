import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINRShort } from "@/lib/format/currency";
import { STAGES } from "@/lib/deal/stages";
import { formatPhoneIN } from "@/lib/format/phone";
import { ArrowRight } from "lucide-react";
import type { DealRow } from "@/lib/deal/types";

export function DealSummaryCard({ deal, propertyId }: { deal: DealRow; propertyId: string }) {
  const doneCount = STAGES.filter(s => deal.steps?.[s.key]?.done).length;
  const total = STAGES.length;
  const pct = Math.round((doneCount / total) * 100);
  const currentStage = STAGES.find(s => s.key === deal.current_stage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="eyebrow">Active sale deal</CardTitle>
            <CardDescription>
              {deal.buyer_name ? <>Buyer: <strong>{deal.buyer_name}</strong></> : "Buyer not set"}
              {deal.buyer_phone && ` · ${formatPhoneIN(deal.buyer_phone)}`}
            </CardDescription>
          </div>
          {deal.agreed_amount ? (
            <div className="text-right">
              <p className="tabular font-display text-2xl leading-none">{formatINRShort(deal.agreed_amount)}</p>
              <p className="eyebrow mt-2">Agreed</p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{currentStage ? `Now: ${currentStage.title}` : "Not started"}</span>
          <span>{doneCount}/{total} · {pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-strong">
          <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex justify-end">
          <Link href={`/properties/${propertyId}/deal`}>
            <Button size="sm" variant="outline">
              Open pipeline <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
