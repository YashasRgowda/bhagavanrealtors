import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "./PrintButton";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatINRShort } from "@/lib/format/currency";
import { formatPhoneIN } from "@/lib/format/phone";
import { formatArea } from "@/lib/format/area";
import { PROPERTY_TYPES } from "@/lib/property/enums";
import { STAGES, type StageKey } from "@/lib/deal/stages";
import { format } from "date-fns";
import {
  ArrowLeft, Archive, CheckCircle2, Home, FileText, User, MapPin,
  IndianRupee, Landmark, Calendar, Award, Check, X, PartyPopper, Ban, Receipt, ShieldCheck,
} from "lucide-react";
import type { DocRowValue } from "@/lib/deal/types";
import type { DealRow } from "@/lib/deal/types";
import type { PropertyRow } from "@/lib/property/types";

type SellerContact = {
  owner_name: string | null;
  owner_phone: string | null;
  owner_alt_phone: string | null;
  relationship: string | null;
  brokerage_expected: number | null;
  private_notes: string | null;
  owner_father?: string | null;
  owner_pan?: string | null;
  owner_aadhaar?: string | null;
  is_nri?: boolean | null;
  nri_country?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_ifsc?: string | null;
  has_coowner?: boolean | null;
  coowner_name?: string | null;
  coowner_relation?: string | null;
  coowner_pan?: string | null;
  coowner_aadhaar?: string | null;
} | null;

export function ClosedDealReport({
  propertyId, prop, deal, seller, backHref,
}: {
  propertyId: string;
  prop: PropertyRow;
  deal: DealRow;
  seller?: SellerContact;
  backHref?: string;
}) {
  const typeLabel = (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
    .find(t => t.value === prop.property_type)?.label ?? prop.property_type;

  // Pull each stage's captured values into locals for readability.
  type StepValues = Record<string, string | number | boolean | undefined>;
  const buyer      = (deal.steps?.buyer_found?.values ?? {}) as StepValues;
  const sellerInfo = (deal.steps?.seller_info?.values ?? {}) as StepValues;
  const token      = (deal.steps?.token?.values       ?? {}) as StepValues;
  const agreement  = (deal.steps?.agreement?.values   ?? {}) as StepValues;
  const docs       = (deal.steps?.docs?.values        ?? {}) as StepValues;
  const khata      = (deal.steps?.khata?.values       ?? {}) as StepValues;
  const loan       = (deal.steps?.loan?.values        ?? {}) as StepValues;
  const saleDeed   = (deal.steps?.sale_deed?.values   ?? {}) as StepValues;
  const stampReg   = (deal.steps?.stamp_reg?.values   ?? {}) as StepValues;
  const tds        = (deal.steps?.tds?.values         ?? {}) as StepValues;
  const register   = (deal.steps?.register?.values    ?? {}) as StepValues;
  const mutation   = (deal.steps?.mutation?.values    ?? {}) as StepValues;
  const possession = (deal.steps?.possession?.values  ?? {}) as StepValues;

  // Cancellation metadata written by /api/deals/[id]/cancel
  const meta = (deal.steps as unknown as { _meta?: { cancelled?: boolean; cancelled_at?: string; cancellation_reason?: string | null } })?._meta;
  const isCancelled = Boolean(meta?.cancelled);

  const num = (v: unknown): number | null =>
    v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  const str = (v: unknown): string | null => (v === undefined || v === null || v === "") ? null : String(v);

  // Financials
  const agreedPrice     = num(buyer.agreed_price) ?? deal.agreed_amount;
  const tokenAmount     = num(token.amount);
  const furtherAdvance  = num(agreement.further_advance);
  const finalSaleValue  = num(saleDeed.final_value);
  const stampDuty       = num(stampReg.stamp_amount);
  const registrationFee = num(stampReg.reg_amount);
  const cess            = num(stampReg.cess);
  const finalBalance    = num(possession.final_balance);
  const brokerage       = num(possession.brokerage_received) ?? deal.brokerage_received;

  const govtCharges = (stampDuty ?? 0) + (registrationFee ?? 0) + (cess ?? 0);
  const totalCollected = (tokenAmount ?? 0) + (furtherAdvance ?? 0) + (finalBalance ?? 0);

  // Docs collected
  const docKeys: Array<[string, string]> = [
    ["sale_deed",     "Title / Sale deed"],
    ["mother_deed",   "Mother deed"],
    ["ec",            "Encumbrance Certificate"],
    ["khata_cert",    "Khata certificate & extract"],
    ["tax_receipt",   "Latest property tax receipt"],
    ["approved_plan", "Approved plan / OC"],
    ["noc",           "NOCs (society/apartment)"],
    ["legal_report",  "Legal & valuation report"],
  ];
  const isDocOk = (k: string) => {
    const v = docs[k] as unknown;
    if (v === true) return true;                           // legacy checkbox shape
    if (v && typeof v === "object" && "ok" in v) return Boolean((v as DocRowValue).ok);
    return false;
  };
  const docsCollected = docKeys.filter(([k]) => isDocOk(k));
  const docsMissing   = docKeys.filter(([k]) => !isDocOk(k));

  const khataTypeLabel = ({
    A: "A-Khata (fully legal)", B: "B-Khata (restricted)",
    E: "E-Khata (BBMP e-Aasthi)", none: "None",
  } as Record<string, string>)[String(khata.khata_type ?? "")] ?? "—";

  // Timeline — every stage that has any data
  const timeline = STAGES.map(s => {
    const step = deal.steps?.[s.key];
    if (!step) return null;
    const values = step.values ?? {};
    const done = step.done;
    // Pick a "primary date" per stage
    const dateField = values.date ?? values.possession_date ?? values.sanction_date ?? values.disbursement_date;
    const noteField = values.note;
    return {
      key: s.key, title: s.title, done,
      date: dateField ? String(dateField) : null,
      note: noteField ? String(noteField) : null,
    };
  }).filter(Boolean) as Array<{ key: StageKey; title: string; done: boolean; date: string | null; note: string | null }>;

  const closedOn  = deal.closed_at ? safeDate(deal.closed_at) : null;
  const startedOn = safeDate(deal.created_at);

  return (
    <div className="mx-auto max-w-4xl space-y-4 print:max-w-none">
      {/* ─── Top bar (hidden on print) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={backHref ?? `/properties/${propertyId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {backHref ? "Back" : "Property"}
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={isCancelled ? "danger" : "muted"}>{isCancelled ? "Cancelled" : "Sold"}</Badge>
          <PrintButton />
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/5 p-4 text-sm">
          <p className="font-medium text-[color:var(--danger)]">This deal was cancelled.</p>
          {meta?.cancellation_reason && <p className="mt-1 text-[color:var(--danger)]/90">Reason: {meta.cancellation_reason}</p>}
          {meta?.cancelled_at && <p className="mt-0.5 text-xs text-muted-foreground">Cancelled on {safeDate(meta.cancelled_at)}. The property has been returned to the Live catalogue.</p>}
        </div>
      )}

      {/* ─── Header: celebration + property ─── */}
      <Card className={`border-border-strong bg-muted/40 print:border-black ${isCancelled ? "border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-primary-foreground ${isCancelled ? "bg-[color:var(--danger)]" : "bg-primary"}`}>
                {isCancelled ? <Ban className="h-6 w-6" /> : <PartyPopper className="h-6 w-6" />}
              </div>
              <div>
                <p className={`text-xs uppercase tracking-widest ${isCancelled ? "text-[color:var(--danger)]" : "text-primary"}`}>
                  Deal record · {isCancelled ? "cancelled" : "closed"}
                </p>
                <h1 className="mt-1.5 font-display text-[1.625rem] leading-tight">{prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {typeLabel}
                  {prop.bhk ? ` · ${prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK`}` : ""}
                  {prop.area_value ? ` · ${formatArea(prop.area_value, prop.area_unit)}` : ""}
                </p>
                {(prop.locality || prop.city) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {[prop.locality, prop.city].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Final sale value</p>
              <p className="tabular font-display text-[2rem] leading-none">{formatINRShort(finalSaleValue ?? agreedPrice ?? 0)}</p>
              <p className="text-xs text-muted-foreground">{formatINR(finalSaleValue ?? agreedPrice ?? 0)}</p>
            </div>
          </div>

          {/* headline stats */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={<User className="h-4 w-4" />}         label="Buyer"      value={str(buyer.buyer_name) ?? deal.buyer_name ?? "—"} />
            <Stat icon={<Award className="h-4 w-4" />}        label="Brokerage"  value={brokerage ? formatINRShort(brokerage) : "—"} highlight />
            <Stat icon={<Calendar className="h-4 w-4" />}     label="Started"    value={startedOn} />
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Closed"     value={closedOn ?? "—"} />
          </div>
        </CardContent>
      </Card>

      <Section icon={<User className="h-4 w-4" />} title="Buyer & terms">
        <Row label="Buyer name"          value={str(buyer.buyer_name) ?? deal.buyer_name ?? "—"} />
        <Row label="Buyer phone"         value={(() => { const p = str(buyer.buyer_phone) ?? deal.buyer_phone; return p ? formatPhoneIN(p) : "—"; })()} />
        <Row label="Father / spouse"     value={str(buyer.buyer_father) ?? "—"} />
        <Row label="PAN"                 value={str(buyer.buyer_pan) ?? "—"} />
        <Row label="Aadhaar"             value={str(buyer.buyer_aadhaar) ? maskAadhaar(str(buyer.buyer_aadhaar)!) : "—"} />
        <Row label="Permanent address"   value={str(buyer.buyer_address) ?? "—"} />
        <Row label="Agreed price"        value={agreedPrice ? `${formatINRShort(agreedPrice)} (${formatINR(agreedPrice)})` : "—"} />
        <Row label="Deal started"        value={str(buyer.date) ? safeDate(str(buyer.date)!) : startedOn} />
        {Boolean(buyer.has_cobuyer) && (
          <>
            <hr className="my-1 border-border" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Co-buyer</p>
            <Row label="Co-buyer name"    value={str(buyer.cobuyer_name) ?? "—"} />
            <Row label="Co-buyer phone"   value={str(buyer.cobuyer_phone) ? formatPhoneIN(str(buyer.cobuyer_phone)!) : "—"} />
            <Row label="Co-buyer PAN"     value={str(buyer.cobuyer_pan) ?? "—"} />
            <Row label="Relationship"     value={str(buyer.cobuyer_relation) ?? "—"} />
          </>
        )}
      </Section>

      {(str(sellerInfo.seller_name) || (seller && (seller.owner_name || seller.owner_phone))) && (
        <Section icon={<ShieldCheck className="h-4 w-4" />} title="Seller — KYC & payout">
          <Row label="Seller name"        value={str(sellerInfo.seller_name) ?? seller?.owner_name ?? "—"} />
          <Row label="Seller phone"       value={seller?.owner_phone ? formatPhoneIN(seller.owner_phone) : "—"} />
          <Row label="Father / spouse"    value={str(sellerInfo.seller_father) ?? "—"} />
          <Row label="PAN"                value={str(sellerInfo.seller_pan) ?? "—"} />
          <Row label="Aadhaar"            value={str(sellerInfo.seller_aadhaar) ? maskAadhaar(str(sellerInfo.seller_aadhaar)!) : "—"} />
          <hr className="my-1 border-border" />
          <Row label="Bank name"          value={str(sellerInfo.bank_name) ?? "—"} />
          <Row label="Account number"     value={str(sellerInfo.bank_account) ? maskAccount(str(sellerInfo.bank_account)!) : "—"} />
          <Row label="IFSC"               value={str(sellerInfo.bank_ifsc) ?? "—"} />
          {Boolean(sellerInfo.is_nri) && (
            <>
              <hr className="my-1 border-border" />
              <Row label="NRI status"     value="Yes" bold />
              <Row label="Country"        value={str(sellerInfo.nri_country) ?? "—"} />
            </>
          )}
          {Boolean(sellerInfo.has_coowner) && (
            <>
              <hr className="my-1 border-border" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Co-owner</p>
              <Row label="Co-owner name"     value={str(sellerInfo.coowner_name) ?? "—"} />
              <Row label="Relationship"      value={str(sellerInfo.coowner_relation) ?? "—"} />
              <Row label="Co-owner PAN"      value={str(sellerInfo.coowner_pan) ?? "—"} />
              <Row label="Co-owner Aadhaar"  value={str(sellerInfo.coowner_aadhaar) ? maskAadhaar(str(sellerInfo.coowner_aadhaar)!) : "—"} />
            </>
          )}
          {seller?.brokerage_expected ? (
            <>
              <hr className="my-1 border-border" />
              <Row label="Brokerage agreed" value={formatINR(seller.brokerage_expected)} />
            </>
          ) : null}
          {seller?.private_notes && <NoteRow label="Private notes on seller" value={seller.private_notes} />}
        </Section>
      )}


      <Section icon={<FileText className="h-4 w-4" />} title={`Documents (${docsCollected.length}/${docKeys.length} verified)`}>
        <ul className="grid gap-1.5">
          {docKeys.map(([k, label]) => {
            const row = docs[k] as DocRowValue | undefined;
            const ok = Boolean(row && row.ok);
            const url = docPublicUrl(row);
            return (
              <li key={k} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                {ok ? <Check className="h-4 w-4 shrink-0 text-[color:var(--success)]" /> : <X className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={`flex-1 truncate ${ok ? "" : "text-muted-foreground"}`}>{label}</span>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <FileText className="h-3.5 w-3.5" /> {row?.filename ? truncate(row.filename, 24) : "attachment"}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">no file attached</span>
                )}
              </li>
            );
          })}
        </ul>
        {docsMissing.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {docsMissing.length} item{docsMissing.length === 1 ? "" : "s"} not ticked off — file may be incomplete for future reference.
          </p>
        )}
        {Boolean(docs.note) && <NoteRow label="Notes on documents" value={String(docs.note)} />}
      </Section>

      {/* ─── Khata & mutation ─── */}
      <Section icon={<Landmark className="h-4 w-4" />} title="Khata & mutation">
        <Row label="Khata type at sale" value={khataTypeLabel} />
        <Row label="Conversion pending"  value={Boolean(khata.conversion_pending) ? "Yes — flagged before registration" : "No"} />
        <Row label="Mutation to buyer completed" value={mutation.date ? safeDate(String(mutation.date)) : "—"} />
        {Boolean(khata.note) && <NoteRow label="Khata notes" value={String(khata.note)} />}
        {Boolean(mutation.note) && <NoteRow label="Mutation notes" value={String(mutation.note)} />}
      </Section>

      {/* ─── Loan (if any) ─── */}
      {(loan.bank || loan.sanction_amount) && (
        <Section icon={<Landmark className="h-4 w-4" />} title="Buyer home loan">
          <Row label="Bank"              value={str(loan.bank) ?? "—"} />
          <Row label="Sanction amount"   value={num(loan.sanction_amount) ? formatINR(num(loan.sanction_amount)!) : "—"} />
          <Row label="Sanction date"     value={loan.sanction_date ? safeDate(String(loan.sanction_date)) : "—"} />
          <Row label="Disbursement date" value={loan.disbursement_date ? safeDate(String(loan.disbursement_date)) : "—"} />
          {Boolean(loan.note) && <NoteRow label="Loan notes" value={String(loan.note)} />}
        </Section>
      )}

      {/* ─── Sale deed & registration ─── */}
      <Section icon={<FileText className="h-4 w-4" />} title="Sale deed & registration">
        <Row label="Deed drafted by"     value={str(saleDeed.drafted_by) ?? "—"} />
        <Row label="Drafted on"          value={saleDeed.date ? safeDate(String(saleDeed.date)) : "—"} />
        <Row label="Final sale value"    value={finalSaleValue ? formatINR(finalSaleValue) : "—"} />
        <hr className="my-1 border-border" />
        <Row label="Stamp duty paid"     value={stampDuty       ? formatINR(stampDuty)       : "—"} />
        <Row label="Registration fee"    value={registrationFee ? formatINR(registrationFee) : "—"} />
        <Row label="Cess & surcharge"    value={cess            ? formatINR(cess)            : "—"} />
        <Row label="Total govt. charges" value={govtCharges     ? formatINR(govtCharges)     : "—"} bold />
        <Row label="Paid on"             value={stampReg.date ? safeDate(String(stampReg.date)) : "—"} />
        <hr className="my-1 border-border" />
        <Row label="Sub-Registrar Office" value={str(register.sro) ?? "—"} />
        <Row label="Registration date"    value={register.date ? safeDate(String(register.date)) : "—"} />
        <Row label="Kaveri reference no." value={str(register.kaveri_ref) ?? "—"} />
        {Boolean(saleDeed.note) && <NoteRow label="Sale deed notes"    value={String(saleDeed.note)} />}
        {Boolean(stampReg.note) && <NoteRow label="Stamp/reg notes"    value={String(stampReg.note)} />}
        {Boolean(register.note) && <NoteRow label="Registration notes" value={String(register.note)} />}
        {docPublicUrl(saleDeed.draft_file as DocRowValue | undefined) && (
          <AttachmentRow label="Sale deed draft" url={docPublicUrl(saleDeed.draft_file as DocRowValue)!} filename={(saleDeed.draft_file as DocRowValue).filename} />
        )}
        {docPublicUrl(stampReg.receipt as DocRowValue | undefined) && (
          <AttachmentRow label="Stamp/reg receipt" url={docPublicUrl(stampReg.receipt as DocRowValue)!} filename={(stampReg.receipt as DocRowValue).filename} />
        )}
        {docPublicUrl(register.registered_deed as DocRowValue | undefined) && (
          <AttachmentRow label="Registered deed" url={docPublicUrl(register.registered_deed as DocRowValue)!} filename={(register.registered_deed as DocRowValue).filename} />
        )}
      </Section>

      {(Boolean(tds.applicable) || num(tds.tds_amount) || tds.challan_no) && (
        <Section icon={<Receipt className="h-4 w-4" />} title="TDS (Form 26QB)">
          <Row label="TDS applicable"       value={Boolean(tds.applicable) ? "Yes (sale > ₹50 Lakh)" : "No"} />
          <Row label="TDS deducted"         value={num(tds.tds_amount) ? formatINR(num(tds.tds_amount)!) : "—"} bold />
          <Row label="Deducted on"          value={tds.deducted_on ? safeDate(String(tds.deducted_on)) : "—"} />
          <Row label="26QB challan / ack no." value={str(tds.challan_no) ?? "—"} />
          <Row label="Form 16B issued"      value={Boolean(tds.form_16b_issued) ? (tds.form_16b_date ? `Yes (${safeDate(String(tds.form_16b_date))})` : "Yes") : "Not yet"} />
          {docPublicUrl(tds.form_16b_file as DocRowValue | undefined) && (
            <AttachmentRow label="Form 16B" url={docPublicUrl(tds.form_16b_file as DocRowValue)!} filename={(tds.form_16b_file as DocRowValue).filename} />
          )}
          {Boolean(tds.note) && <NoteRow label="TDS notes" value={String(tds.note)} />}
        </Section>
      )}

      {/* ─── Possession & brokerage ─── */}
      <Section icon={<Home className="h-4 w-4" />} title="Possession & brokerage">
        <Row label="Possession handover" value={possession.possession_date ? safeDate(String(possession.possession_date)) : "—"} />
        <Row label="Final balance paid"  value={finalBalance ? formatINR(finalBalance) : "—"} />
        <Row label="Brokerage received"  value={brokerage ? formatINR(brokerage) : "—"} bold />
        <Row label="Brokerage received on" value={possession.brokerage_date ? safeDate(String(possession.brokerage_date)) : "—"} />
        {Boolean(possession.note) && <NoteRow label="Closing notes" value={String(possession.note)} />}
      </Section>

      {/* ─── Timeline ─── */}
      <Section icon={<Calendar className="h-4 w-4" />} title="Timeline">
        <ol className="space-y-2">
          {timeline.map(s => (
            <li key={s.key} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs
                ${s.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s.done ? <Check className="h-3.5 w-3.5" /> : "·"}
              </span>
              <div className="flex-1">
                <p className="font-medium">{s.title}</p>
                {s.date && <p className="text-xs text-muted-foreground">{safeDate(s.date)}</p>}
                {s.note && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{s.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ─── Actions ─── */}
      <div className="flex flex-col gap-2 sm:flex-row print:hidden">
        <Link href={`/properties/${propertyId}`} className="flex-1">
          <Button variant="outline" className="w-full"><CheckCircle2 className="h-4 w-4" /> View property</Button>
        </Link>
        <Link href="/properties/parked" className="flex-1">
          <Button className="w-full"><Archive className="h-4 w-4" /> Go to Archive</Button>
        </Link>
      </div>
    </div>
  );
}

/* ─── Small building blocks ─── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="eyebrow flex items-center gap-2">
          <span className="text-primary">{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">{children}</CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border border-border bg-card p-3 ${highlight ? "border-primary/40" : ""}`}>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>{label}
      </p>
      <p className={`mt-1 truncate text-sm font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function MoneyRow({ label, amount, date, extra }: { label: string; amount: number | null; date?: string | null; extra?: string | null }) {
  const dateStr: string = date ?? "";
  const extraStr: string = extra ?? "";
  if (!amount && !dateStr && !extraStr) return <Row label={label} value="—" />;
  const meta = [dateStr ? safeDate(dateStr) : "", extraStr].filter(Boolean).join(" · ");
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {meta ? <p className="text-[11px] text-muted-foreground">{meta}</p> : null}
      </div>
      <span className="font-medium">{amount ? formatINR(amount) : "—"}</span>
    </div>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
      <p className="mb-0.5 uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-line">{value}</p>
    </div>
  );
}

function safeDate(s: string): string {
  try { return format(new Date(s), "d MMM yyyy"); } catch { return s; }
}

function docPublicUrl(row: DocRowValue | undefined): string | null {
  if (!row || !row.storage_path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "property-media";
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${row.storage_path}`;
}

function AttachmentRow({ label, url, filename }: { label: string; url: string; filename?: string }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        <FileText className="h-3.5 w-3.5" /> {filename ? truncate(filename, 40) : "open"}
      </a>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function maskAadhaar(s: string): string {
  const d = s.replace(/\D/g, "");
  if (d.length !== 12) return s;
  return `xxxx xxxx ${d.slice(-4)}`;
}

function maskAccount(s: string): string {
  const d = s.replace(/\s/g, "");
  if (d.length <= 4) return d;
  return `${"x".repeat(d.length - 4)}${d.slice(-4)}`;
}

function renderMoneyFlow(props: {
  tokenAmount: number | null; tokenDate: string | null; tokenMode: string | null;
  furtherAdvance: number | null; agreementDate: string | null; closeBy: string | null;
  finalBalance: number | null; possessionDate: string | null;
  totalCollected: number; finalSaleValue: number | null;
}): React.ReactElement {
  const tokenExtra: string | null = props.tokenMode ? `Mode: ${props.tokenMode}` : null;
  const advanceExtra: string | null = props.closeBy ? `Registration by ${safeDate(props.closeBy)}` : null;
  return (
    <Section icon={<IndianRupee className="h-4 w-4" />} title="Money flow">
      <MoneyRow label="Token / advance" amount={props.tokenAmount} date={props.tokenDate} extra={tokenExtra} />
      <MoneyRow label="Further advance on agreement" amount={props.furtherAdvance} date={props.agreementDate} extra={advanceExtra} />
      <MoneyRow label="Final balance at possession" amount={props.finalBalance} date={props.possessionDate} />
      <hr className="my-1 border-border" />
      <Row label="Total collected from buyer" value={props.totalCollected ? formatINR(props.totalCollected) : "—"} bold />
      {props.finalSaleValue !== null ? (
        <Row label="Final sale value (per deed)" value={formatINR(props.finalSaleValue)} bold />
      ) : null}
    </Section>
  );
}

