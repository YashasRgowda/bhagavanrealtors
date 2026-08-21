/**
 * Indian rupee formatting: Lakh (1,00,000) and Crore (1,00,00,000).
 * Input is always plain rupees (no paise).
 */

export function formatINR(rupees: number | bigint | null | undefined): string {
  if (rupees === null || rupees === undefined) return "—";
  const n = typeof rupees === "bigint" ? Number(rupees) : rupees;
  if (!Number.isFinite(n)) return "—";
  return "₹" + new Intl.NumberFormat("en-IN").format(n);
}

/** "₹45 Lakh", "₹1.25 Cr", "₹25,000" */
export function formatINRShort(rupees: number | bigint | null | undefined): string {
  if (rupees === null || rupees === undefined) return "—";
  const n = typeof rupees === "bigint" ? Number(rupees) : rupees;
  if (!Number.isFinite(n) || n === 0) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000;
    return `${sign}₹${trim(cr)} Cr`;
  }
  if (abs >= 1_00_000) {
    const l = abs / 1_00_000;
    return `${sign}₹${trim(l)} Lakh`;
  }
  if (abs >= 1_000) {
    return `${sign}₹${trim(abs / 1000)}k`;
  }
  return `${sign}₹${abs}`;
}

function trim(n: number): string {
  const s = n.toFixed(2);
  return s.replace(/\.?0+$/, "");
}

/** Parse messy human input ("45L", "1.2 cr", "25000") into rupees. */
export function parseINR(input: string): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/[₹,\s]/g, "");
  const m = s.match(/^([0-9]*\.?[0-9]+)(cr|crore|l|lakh|k|thousand)?$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const unit = m[2];
  if (!unit) return Math.round(num);
  if (unit === "k" || unit === "thousand") return Math.round(num * 1_000);
  if (unit === "l" || unit === "lakh") return Math.round(num * 1_00_000);
  if (unit === "cr" || unit === "crore") return Math.round(num * 1_00_00_000);
  return Math.round(num);
}
