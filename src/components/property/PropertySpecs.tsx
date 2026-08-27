import { Card } from "@/components/ui/card";
import { formatArea } from "@/lib/format/area";
import { formatINRShort } from "@/lib/format/currency";
import { PROPERTY_TYPES, TRANSACTION_TYPES } from "@/lib/property/enums";
import { describeAttributes, type Spec } from "@/lib/property/attributes";
import type { PropertyRow } from "@/lib/property/types";

/**
 * Every fact about the property, in one labelled grid.
 *
 * Core columns first (what it is, how big, how configured), then the
 * type-specific long tail from `attributes` — all run through the label layer,
 * so the grid reads as prose-free specifications rather than a database dump.
 */
export function PropertySpecs({ prop }: { prop: PropertyRow }) {
  const typeLabel =
    (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
      .find(t => t.value === prop.property_type)?.label ?? prop.property_type;
  const dealLabel =
    TRANSACTION_TYPES.find(t => t.value === prop.transaction_type)?.label ?? prop.transaction_type;

  const core: Spec[] = [
    { label: "Type", value: typeLabel },
    { label: "Deal", value: dealLabel },
    prop.bhk ? { label: "Configuration", value: prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK` } : null,
    prop.area_value ? { label: "Area", value: formatArea(prop.area_value, prop.area_unit) } : null,
    prop.deposit ? { label: "Deposit", value: formatINRShort(prop.deposit) } : null,
  ].filter((s): s is Spec => s !== null);

  const specs = [...core, ...describeAttributes(prop.attributes)];

  return (
    <Card className="p-5">
      <h2 className="text-micro uppercase text-ink-muted">Details</h2>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {specs.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-micro uppercase text-ink-muted">{label}</dt>
            <dd className="mt-1.5 truncate text-sm font-medium text-ink" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
