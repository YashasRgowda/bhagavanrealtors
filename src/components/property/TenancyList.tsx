import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINRShort } from "@/lib/format/currency";
import { formatPhoneIN } from "@/lib/format/phone";
import { format } from "date-fns";

type Tenancy = {
  id: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  rent_amount: number | null;
  deposit: number | null;
  lease_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

export function TenancyList({ items }: { items: Tenancy[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow">Tenancy history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(t => {
          const current = !t.end_date;
          const money = t.lease_amount
            ? `${formatINRShort(t.lease_amount)} lease`
            : t.rent_amount
              ? `${formatINRShort(t.rent_amount)}/mo`
              : "—";
          const dates = t.start_date
            ? `${safeDate(t.start_date)}${t.end_date ? ` → ${safeDate(t.end_date)}` : " → present"}`
            : "";
          return (
            <div key={t.id} className="rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {t.tenant_name || "Tenant"}
                    {t.tenant_phone && (
                      <span className="ml-2 text-xs text-muted-foreground">{formatPhoneIN(t.tenant_phone)}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{dates}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-sm font-semibold">{money}</p>
                  {t.deposit ? <p className="text-xs text-muted-foreground">Deposit {formatINRShort(t.deposit)}</p> : null}
                </div>
                {current && <Badge variant="success">Current</Badge>}
              </div>
              {t.notes && <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{t.notes}</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function safeDate(s: string): string {
  try { return format(new Date(s), "d MMM yyyy"); } catch { return s; }
}
