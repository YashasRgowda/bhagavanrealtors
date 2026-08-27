import { cn } from "@/lib/utils";

/**
 * Indian money, rendered as figure + unit so the unit can sit smaller and
 * muted beside the number — `₹45.5 L`, `₹1.2 Cr`.
 *
 * Splitting here rather than in `lib/format/currency` on purpose: that helper
 * is shared with posters, share pages and the deal report, all of which want
 * the long form ("₹45 Lakh"). This is a display concern only.
 */
export function splitINR(rupees: number | null | undefined): {
  figure: string;
  unit: string | null;
} {
  if (rupees === null || rupees === undefined || !Number.isFinite(Number(rupees))) {
    return { figure: "—", unit: null };
  }
  const n = Number(rupees);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const trim = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");

  if (abs >= 1_00_00_000) return { figure: `${sign}₹${trim(abs / 1_00_00_000)}`, unit: "Cr" };
  if (abs >= 1_00_000)    return { figure: `${sign}₹${trim(abs / 1_00_000)}`,    unit: "L"  };
  return { figure: `${sign}₹${new Intl.NumberFormat("en-IN").format(abs)}`, unit: null };
}

export function Money({
  rupees,
  suffix,
  className,
  unitClassName,
}: {
  rupees: number | null | undefined;
  /** e.g. "/mo" — sits after the unit, in the same muted treatment. */
  suffix?: string;
  className?: string;
  unitClassName?: string;
}) {
  const { figure, unit } = splitINR(rupees);
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span>{figure}</span>
      {(unit || suffix) && (
        <span className={cn("text-unit font-medium text-ink-muted", unitClassName)}>
          {[unit, suffix].filter(Boolean).join(" ")}
        </span>
      )}
    </span>
  );
}
