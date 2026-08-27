"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AREA_UNITS, toSqft, type AreaUnit } from "@/lib/format/area";
import { BHK_OPTIONS, SOURCES } from "@/lib/property/enums";
import { formatINRShort } from "@/lib/format/currency";
import { AlertTriangle, FileText, IndianRupee, Lock, MapPin, Ruler } from "lucide-react";
import { Field, FieldGroup, FormCard, RevealPanel, ToggleRow } from "@/components/ui/form";
import { GpsCapture } from "./GpsCapture";
import { DuplicateWarning } from "./DuplicateWarning";
import type { WizardState } from "./types";

export function DetailsForm({
  state, set, propertyId, errors,
}: {
  state: WizardState;
  set: (patch: Partial<WizardState>) => void;
  /** Set once the property has been saved once — used to exclude it from duplicate check. */
  propertyId?: string | null;
  /** Field-keyed messages, shown inline once the dealer has tried to continue. */
  errors?: Record<string, string | undefined>;
}) {
  const isSale = state.transaction_type === "sale";
  const isRent = state.transaction_type === "rent";
  const isLease = state.transaction_type === "lease";
  const cat = state.category;
  const type = state.property_type;

  const isResidentialDwelling =
    cat === "residential" && ["flat", "villa", "builder_floor", "studio", "penthouse"].includes(type);
  const isPlot = cat === "land" && ["res_plot", "com_plot"].includes(type);
  const isAgri = cat === "land" && ["agri_land", "farm_land"].includes(type);
  const isShopOffice = cat === "commercial" && ["shop", "office", "restaurant", "coworking"].includes(type);
  const isWholeBuilding = cat === "commercial" && type === "building";
  const isWarehouse = cat === "commercial" && type === "warehouse";
  const isPG = cat === "residential" && type === "pg";

  const patchAttr = (k: string, v: unknown) =>
    set({ attributes: { ...state.attributes, [k]: v } });

  // ── Smart: plot dimensions → auto area (sq.ft) ──
  // Auto-fills plot area from length × breadth, but only while the dealer hasn't
  // typed a manual area. Editing the area field directly stops the auto-calc.
  const setPlotDim = (dim: "length_ft" | "breadth_ft", raw: string) => {
    const num = raw ? Number(raw) : null;
    const nextAttrs: Record<string, unknown> = { ...state.attributes, [dim]: num };
    const L = Number(dim === "length_ft" ? num : state.attributes.length_ft) || 0;
    const B = Number(dim === "breadth_ft" ? num : state.attributes.breadth_ft) || 0;
    const patch: Partial<WizardState> = {};
    if (L > 0 && B > 0 && (!state.area_value || state.attributes._area_auto)) {
      nextAttrs._area_auto = true;
      patch.area_value = Math.round(L * B);
      patch.area_unit = "sqft";
    }
    patch.attributes = nextAttrs;
    set(patch);
  };

  const onAreaManual = (raw: string) => {
    set({
      area_value: raw ? Number(raw) : null,
      attributes: { ...state.attributes, _area_auto: false },
    });
  };

  // ── Smart: price per sq.ft (display only) ──
  const areaInSqft = state.area_value ? toSqft(state.area_value, (state.area_unit as AreaUnit) ?? "sqft") : 0;
  const pricePerSqft = isSale && state.price && areaInSqft > 0 ? Math.round(state.price / areaInSqft) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Price ─────────────────────────────────── */}
      <FormCard
        icon={<IndianRupee strokeWidth={1.75} />}
        title="Price"
        description="What you're asking for it."
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2">
          <Field required htmlFor="f-price" error={errors?.price} label={isSale ? "Expected price (₹)" : isRent ? "Monthly rent (₹)" : "Lease amount (₹)"}>
            <Input
              id="f-price"
              inputMode="numeric"
              value={state.price ?? ""}
              onChange={(e) => set({ price: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })}
              placeholder={isSale ? "e.g. 4500000" : isRent ? "e.g. 25000" : "e.g. 1500000"}
            />
            {state.price ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatINRShort(state.price)}
                {pricePerSqft ? ` · ₹${new Intl.NumberFormat("en-IN").format(pricePerSqft)}/sq.ft` : ""}
              </p>
            ) : null}
          </Field>
          {(isRent || isLease) && (
            <Field label={isRent ? "Deposit (₹)" : "Monthly rent, if any (₹)"}>
              <Input
                inputMode="numeric"
                value={state.deposit ?? ""}
                onChange={(e) => set({ deposit: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })}
              />
            </Field>
          )}
          {isSale && (
            <Field label="Negotiable?">
              <Select
                value={state.is_negotiable ? "yes" : "no"}
                onChange={(e) => set({ is_negotiable: e.target.value === "yes" })}
              >
                <option value="yes">Yes</option>
                <option value="no">Firm</option>
              </Select>
            </Field>
          )}
        </div>

        {isRent && (
          <>
            <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2">
              <Field label="Maintenance">
                <Select
                  value={(state.attributes.maintenance_type as string | undefined) ?? ""}
                  onChange={(e) => patchAttr("maintenance_type", e.target.value)}
                >
                  <option value="">—</option>
                  <option value="included">Included in rent</option>
                  <option value="extra">Extra (paid separately)</option>
                  <option value="none">No maintenance</option>
                </Select>
              </Field>
              {(state.attributes.maintenance_type as string) === "extra" && (
                <Field label="Maintenance amount / month (₹)">
                  <Input
                    inputMode="numeric"
                    value={(state.attributes.maintenance_amount as number | undefined) ?? ""}
                    onChange={(e) => patchAttr("maintenance_amount", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)}
                  />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
              <Field label="Preferred tenant">
                <Select
                  value={(state.attributes.preferred_tenant as string | undefined) ?? ""}
                  onChange={(e) => patchAttr("preferred_tenant", e.target.value)}
                >
                  <option value="">Anyone</option>
                  <option value="family">Family</option>
                  <option value="bachelors">Bachelors</option>
                  <option value="company">Company lease</option>
                </Select>
              </Field>
              <Field label="Notice period (months)">
                <Input
                  inputMode="numeric"
                  value={(state.attributes.notice_period_months as number | undefined) ?? ""}
                  onChange={(e) => patchAttr("notice_period_months", e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 2"
                />
              </Field>
              <Field label="Veg only?">
                <Select
                  value={(state.attributes.veg_only as string | undefined) ?? ""}
                  onChange={(e) => patchAttr("veg_only", e.target.value)}
                >
                  <option value="">No preference</option>
                  <option value="yes">Yes — veg only</option>
                  <option value="no">No restriction</option>
                </Select>
              </Field>
            </div>
          </>
        )}
      </FormCard>

      {/* ─── Area ─────────────────────────────────── */}
      <FormCard
        icon={<Ruler strokeWidth={1.75} />}
        title="Size"
        description="How big it is, and how it is laid out."
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
          <Field required htmlFor="f-area" error={errors?.area_value} label={isPlot || isAgri ? "Plot area" : "Built-up area"}>
            <Input
              id="f-area"
              inputMode="decimal"
              value={state.area_value ?? ""}
              onChange={(e) => onAreaManual(e.target.value)}
            />
            {isPlot && state.attributes._area_auto ? (
              <p className="mt-1 text-xs text-accent-text">Auto-calculated from length × breadth</p>
            ) : null}
          </Field>
          <Field required htmlFor="f-area-unit" label="Unit">
            <Select id="f-area-unit" value={state.area_unit ?? "sqft"} onChange={(e) => set({ area_unit: e.target.value })}>
              {AREA_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Select>
          </Field>
          {isResidentialDwelling && (
            <Field required htmlFor="f-bhk" error={errors?.bhk} label="BHK">
              <Select id="f-bhk" value={state.bhk ?? ""} onChange={(e) => set({ bhk: e.target.value || null })}>
                <option value="">—</option>
                {BHK_OPTIONS.map(b => <option key={b} value={b}>{b === "1RK" ? "1 RK" : `${b} BHK`}</option>)}
              </Select>
            </Field>
          )}
        </div>

        {(isResidentialDwelling) && (
        <FieldGroup title="More details — optional">
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="Carpet area (sq.ft)">
              <Input inputMode="decimal" value={(state.attributes.carpet as number|undefined) ?? ""} onChange={e => patchAttr("carpet", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Bathrooms">
              <Input inputMode="numeric" value={(state.attributes.bathrooms as number|undefined) ?? ""} onChange={e => patchAttr("bathrooms", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Balconies">
              <Input inputMode="numeric" value={(state.attributes.balconies as number|undefined) ?? ""} onChange={e => patchAttr("balconies", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Floor">
              <Input value={(state.attributes.floor as string|undefined) ?? ""} onChange={e => patchAttr("floor", e.target.value)} />
            </Field>
            <Field label="Total floors">
              <Input inputMode="numeric" value={(state.attributes.total_floors as number|undefined) ?? ""} onChange={e => patchAttr("total_floors", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Facing">
              <Select value={(state.attributes.facing as string|undefined) ?? ""} onChange={e => patchAttr("facing", e.target.value)}>
                <option value="">—</option>
                {["N","S","E","W","NE","NW","SE","SW"].map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Furnishing">
              <Select value={(state.attributes.furnishing as string|undefined) ?? ""} onChange={e => patchAttr("furnishing", e.target.value)}>
                <option value="">—</option>
                <option value="unfurnished">Unfurnished</option>
                <option value="semi">Semi-furnished</option>
                <option value="fully">Fully furnished</option>
              </Select>
            </Field>
            <Field label="Age of property (years)">
              <Input inputMode="numeric" placeholder="0 = brand new" value={(state.attributes.age_years as number|undefined) ?? ""} onChange={e => patchAttr("age_years", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Car parking (slots)">
              <Input inputMode="numeric" value={(state.attributes.parking_4w as number|undefined) ?? ""} onChange={e => patchAttr("parking_4w", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Bike parking (slots)">
              <Input inputMode="numeric" value={(state.attributes.parking_2w as number|undefined) ?? ""} onChange={e => patchAttr("parking_2w", e.target.value ? Number(e.target.value) : null)} />
            </Field>
          </div>
        </FieldGroup>
        )}

        {isPlot && (
        <>
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="Length (ft)"><Input inputMode="decimal" value={(state.attributes.length_ft as number|undefined) ?? ""} onChange={e => setPlotDim("length_ft", e.target.value)} /></Field>
            <Field label="Breadth (ft)"><Input inputMode="decimal" value={(state.attributes.breadth_ft as number|undefined) ?? ""} onChange={e => setPlotDim("breadth_ft", e.target.value)} /></Field>
            <Field label="Facing">
              <Select value={(state.attributes.facing as string|undefined) ?? ""} onChange={e => patchAttr("facing", e.target.value)}>
                <option value="">—</option>
                {["N","S","E","W","NE","NW","SE","SW"].map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Road width (ft)"><Input inputMode="decimal" value={(state.attributes.road_width_ft as number|undefined) ?? ""} onChange={e => patchAttr("road_width_ft", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Corner site?">
              <Select value={(state.attributes.corner as string|undefined) ?? ""} onChange={e => patchAttr("corner", e.target.value)}>
                <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
              </Select>
            </Field>
            <Field label="Approval">
              <Select value={(state.attributes.approval as string|undefined) ?? ""} onChange={e => patchAttr("approval", e.target.value)}>
                <option value="">—</option>
                {["BDA","BMRDA","BBMP","DTCP","Gram Panchayat","Unapproved"].map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Khata">
              <Select value={(state.attributes.khata as string|undefined) ?? ""} onChange={e => patchAttr("khata", e.target.value)}>
                <option value="">—</option>
                <option value="A">A-Khata</option>
                <option value="B">B-Khata</option>
                <option value="E">E-Khata</option>
                <option value="none">None</option>
              </Select>
            </Field>
          </div>
          {(() => {
            const k = String(state.attributes.khata ?? "");
            if (k !== "B" && k !== "none") return null;
            return (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
                <div className="text-warning-text">
                  Since <strong>Oct 2024</strong>, a valid <strong>E-Khata</strong> is effectively required to register a
                  property in Bengaluru. {k === "B"
                    ? "B-Khata plots need to be converted to A/E-Khata before a buyer's bank will fund it."
                    : "Without any khata, registration and loan-eligibility will be tough — flag this to serious buyers."}
                </div>
              </div>
            );
          })()}
        </>
        )}

        {isShopOffice && (
        <FieldGroup title="More details — optional">
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="Frontage (ft)"><Input inputMode="decimal" value={(state.attributes.frontage_ft as number|undefined) ?? ""} onChange={e => patchAttr("frontage_ft", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Floor"><Input value={(state.attributes.floor as string|undefined) ?? ""} onChange={e => patchAttr("floor", e.target.value)} /></Field>
            <Field label="Washrooms"><Input inputMode="numeric" value={(state.attributes.washrooms as number|undefined) ?? ""} onChange={e => patchAttr("washrooms", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Power load (KW)"><Input inputMode="decimal" value={(state.attributes.power_kw as number|undefined) ?? ""} onChange={e => patchAttr("power_kw", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Currently"><Select value={(state.attributes.occupancy as string|undefined) ?? ""} onChange={e => patchAttr("occupancy", e.target.value)}>
              <option value="">—</option><option value="vacant">Vacant</option><option value="tenanted">Tenanted</option>
            </Select></Field>
          </div>
        </FieldGroup>
        )}

        {isWholeBuilding && (
        <FieldGroup title="More details — optional">
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="No. of floors"><Input value={(state.attributes.total_floors_wb as string|undefined) ?? ""} onChange={e => patchAttr("total_floors_wb", e.target.value)} /></Field>
            <Field label="No. of flats"><Input inputMode="numeric" value={(state.attributes.units_flats as number|undefined) ?? ""} onChange={e => patchAttr("units_flats", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="No. of shops"><Input inputMode="numeric" value={(state.attributes.units_shops as number|undefined) ?? ""} onChange={e => patchAttr("units_shops", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Current rent / month (₹)"><Input inputMode="numeric" value={(state.attributes.current_rent as number|undefined) ?? ""} onChange={e => patchAttr("current_rent", e.target.value ? Number(e.target.value) : null)} /></Field>
          </div>
        </FieldGroup>
        )}

        {isWarehouse && (
        <FieldGroup title="More details — optional">
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="Clear height (ft)"><Input inputMode="decimal" value={(state.attributes.clear_height_ft as number|undefined) ?? ""} onChange={e => patchAttr("clear_height_ft", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Shutter height (ft)"><Input inputMode="decimal" value={(state.attributes.shutter_ht_ft as number|undefined) ?? ""} onChange={e => patchAttr("shutter_ht_ft", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Docks"><Input inputMode="numeric" value={(state.attributes.docks as number|undefined) ?? ""} onChange={e => patchAttr("docks", e.target.value ? Number(e.target.value) : null)} /></Field>
          </div>
        </FieldGroup>
        )}

        {isAgri && (
        <FieldGroup title="More details — optional">
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="Water source"><Select value={(state.attributes.water as string|undefined) ?? ""} onChange={e => patchAttr("water", e.target.value)}>
              <option value="">—</option>
              <option value="borewell">Borewell</option><option value="canal">Canal</option><option value="well">Well</option><option value="none">None</option>
            </Select></Field>
            <Field label="DC converted?"><Select value={(state.attributes.dc_converted as string|undefined) ?? ""} onChange={e => patchAttr("dc_converted", e.target.value)}>
              <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
            </Select></Field>
            <Field label="Survey no."><Input value={(state.attributes.survey_no as string|undefined) ?? ""} onChange={e => patchAttr("survey_no", e.target.value)} /></Field>
          </div>
        </FieldGroup>
        )}

        {isPG && (
        <FieldGroup title="More details — optional">
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
            <Field label="Sharing"><Select value={(state.attributes.sharing as string|undefined) ?? ""} onChange={e => patchAttr("sharing", e.target.value)}>
              <option value="">—</option><option value="single">Single</option><option value="double">Double</option><option value="triple">Triple</option>
            </Select></Field>
            <Field label="Gender"><Select value={(state.attributes.gender as string|undefined) ?? ""} onChange={e => patchAttr("gender", e.target.value)}>
              <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="coed">Co-ed</option>
            </Select></Field>
            <Field label="Food included?"><Select value={(state.attributes.food as string|undefined) ?? ""} onChange={e => patchAttr("food", e.target.value)}>
              <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
            </Select></Field>
          </div>
        </FieldGroup>
        )}
      </FormCard>

      {/* ─── Location ─────────────────────────────── */}
      <FormCard
        icon={<MapPin strokeWidth={1.75} />}
        title="Location"
        description="Where the property is."
      >
        <GpsCapture state={state} set={set} />
        <DuplicateWarning lat={state.latitude} lng={state.longitude} excludePropertyId={propertyId} />
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2">
          <Field required htmlFor="f-locality" error={errors?.locality} label="Locality"><Input id="f-locality" value={state.locality ?? ""} onChange={e => set({ locality: e.target.value })} placeholder="e.g. Yelahanka New Town" /></Field>
          <Field label="City"><Input value={state.city ?? "Bengaluru"} onChange={e => set({ city: e.target.value })} /></Field>
          <Field label="Building / Society"><Input value={(state.attributes.building as string|undefined) ?? ""} onChange={e => patchAttr("building", e.target.value)} /></Field>
          <Field label="Door / Flat No."><Input value={(state.attributes.door_no as string|undefined) ?? ""} onChange={e => patchAttr("door_no", e.target.value)} /></Field>
          <Field label="Pincode"><Input value={state.pincode ?? ""} onChange={e => set({ pincode: e.target.value })} inputMode="numeric" /></Field>
          <Field label="Landmark"><Input value={(state.attributes.landmark as string|undefined) ?? ""} onChange={e => patchAttr("landmark", e.target.value)} /></Field>
        </div>
        <Field label="Full address (optional)"><Textarea rows={2} value={state.address_text ?? ""} onChange={e => set({ address_text: e.target.value })} /></Field>
      </FormCard>

      {/* ─── Contact ─────────────────────────────── */}
      <FormCard
        icon={<Lock strokeWidth={1.75} />}
        title="Owner details"
        description="Private. This never appears on a listing you share."
      >
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2">
          <Field label="Owner name"><Input value={state.contact.owner_name ?? ""} onChange={e => set({ contact: { ...state.contact, owner_name: e.target.value } })} /></Field>
          <Field required htmlFor="f-owner-phone" error={errors?.owner_phone} label="Owner phone"><Input id="f-owner-phone" inputMode="tel" value={state.contact.owner_phone ?? ""} onChange={e => set({ contact: { ...state.contact, owner_phone: e.target.value } })} placeholder="10-digit or landline" /></Field>
          <Field label="Alt phone"><Input inputMode="tel" value={state.contact.owner_alt_phone ?? ""} onChange={e => set({ contact: { ...state.contact, owner_alt_phone: e.target.value } })} /></Field>
          <Field label="Brokerage expected (₹)"><Input inputMode="numeric" value={state.contact.brokerage_expected ?? ""} onChange={e => set({ contact: { ...state.contact, brokerage_expected: e.target.value ? Number(e.target.value.replace(/\D/g,"")) : null } })} /></Field>
          <Field label="How you found this"><Select value={state.source} onChange={e => set({ source: e.target.value as WizardState["source"] })}>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select></Field>
        </div>
        <Field label="Private notes"><Textarea rows={3} value={state.contact.private_notes ?? ""} onChange={e => set({ contact: { ...state.contact, private_notes: e.target.value } })} placeholder="Anything you want to remember — only you see this." /></Field>

        {/* ─── Optional KYC — auto-prefills every deal ─── */}
        <details className="group rounded-md border border-line-subtle bg-subtle p-5 transition-colors duration-160 open:bg-elevated">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink marker:text-transparent">
            Additional KYC — optional
            <span className="mt-1 block text-sm font-normal text-ink-muted">
              Fill this once and every future deal for this property starts pre-filled.
            </span>
          </summary>
          <div className="mt-5 flex flex-col gap-7">
            <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2">
              <Field label="Father's / spouse's name"><Input value={state.contact.owner_father ?? ""} onChange={e => set({ contact: { ...state.contact, owner_father: e.target.value } })} placeholder="Goes on the sale deed" /></Field>
              <Field label="Owner PAN"><Input value={state.contact.owner_pan ?? ""} onChange={e => set({ contact: { ...state.contact, owner_pan: e.target.value.toUpperCase() } })} placeholder="ABCDE1234F" /></Field>
              <Field label="Owner Aadhaar"><Input inputMode="numeric" value={state.contact.owner_aadhaar ?? ""} onChange={e => set({ contact: { ...state.contact, owner_aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) } })} placeholder="12 digits" /></Field>
            </div>

            <ToggleRow
              checked={state.contact.is_nri}
              onChange={v => set({ contact: { ...state.contact, is_nri: v } })}
              label="Owner is an NRI"
              hint="TDS is 20%+ (not 1%) and Form 15CA/CB is required — flag it early."
            />
            {state.contact.is_nri && (
              <RevealPanel title="NRI details">
                <Field label="Country of residence"><Input value={state.contact.nri_country ?? ""} onChange={e => set({ contact: { ...state.contact, nri_country: e.target.value } })} placeholder="e.g. UAE" /></Field>
              </RevealPanel>
            )}

            <div className="grid grid-cols-1 gap-x-5 gap-y-7 xs:grid-cols-2 sm:grid-cols-3">
              <Field label="Bank name"><Input value={state.contact.bank_name ?? ""} onChange={e => set({ contact: { ...state.contact, bank_name: e.target.value } })} placeholder="For sale proceeds" /></Field>
              <Field label="Bank account no."><Input value={state.contact.bank_account ?? ""} onChange={e => set({ contact: { ...state.contact, bank_account: e.target.value } })} /></Field>
              <Field label="IFSC"><Input value={state.contact.bank_ifsc ?? ""} onChange={e => set({ contact: { ...state.contact, bank_ifsc: e.target.value.toUpperCase() } })} placeholder="HDFC0000123" /></Field>
            </div>

            <ToggleRow
              checked={state.contact.has_coowner}
              onChange={v => set({ contact: { ...state.contact, has_coowner: v } })}
              label="Property is jointly owned"
              hint="Joint owners must both sign the sale deed."
            />

            {state.contact.has_coowner && (
              <RevealPanel title="Co-owner details">
                <Field label="Co-owner name"><Input value={state.contact.coowner_name ?? ""} onChange={e => set({ contact: { ...state.contact, coowner_name: e.target.value } })} /></Field>
                <Field label="Relationship">
                  <Select value={state.contact.coowner_relation ?? ""} onChange={e => set({ contact: { ...state.contact, coowner_relation: e.target.value } })}>
                    <option value="">—</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="child">Son / Daughter</option>
                    <option value="sibling">Brother / Sister</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Co-owner PAN"><Input value={state.contact.coowner_pan ?? ""} onChange={e => set({ contact: { ...state.contact, coowner_pan: e.target.value.toUpperCase() } })} placeholder="ABCDE1234F" /></Field>
                <Field label="Co-owner Aadhaar"><Input inputMode="numeric" value={state.contact.coowner_aadhaar ?? ""} onChange={e => set({ contact: { ...state.contact, coowner_aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) } })} placeholder="12 digits" /></Field>
              </RevealPanel>
            )}
          </div>
        </details>
      </FormCard>

      {/* ─── Title & description ─────────────────── */}
      <FormCard
        icon={<FileText strokeWidth={1.75} />}
        title="Listing text"
        description="Optional. Leave blank and the type and locality are used."
      >
        <Field label="Title"><Input value={state.title ?? ""} onChange={e => set({ title: e.target.value })} placeholder="e.g. 3 BHK Flat for Rent in Yelahanka New Town" /></Field>
        <Field label="Description"><Textarea rows={4} value={state.description ?? ""} onChange={e => set({ description: e.target.value })} placeholder="Anything worth saying — nearby schools, recent renovation, why it is priced this way." /></Field>
      </FormCard>
    </div>
  );
}
