/** Indian mobile: 10 digits, starts 6/7/8/9. */
export function isIndianMobile(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local);
}

/** Landline or mobile — looser (owner contacts may be landlines). */
export function isIndianPhoneLenient(s: string): boolean {
  const d = s.replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15;
}

export function normalizeIndianMobile(s: string): string {
  const d = s.replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

export function formatPhoneIN(s: string | null | undefined): string {
  if (!s) return "—";
  const d = s.replace(/\D/g, "");
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith("91")) {
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  }
  return s;
}
