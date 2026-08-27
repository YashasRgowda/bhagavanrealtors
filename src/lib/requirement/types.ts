export type RequirementStatus = "active" | "fulfilled" | "dropped";
export type Urgency = "immediate" | "soon" | "exploring";

export type RequirementRow = {
  id: string;
  owner_user_id: string;

  buyer_name: string;
  buyer_phone: string | null;
  buyer_alt_phone: string | null;
  source: "walkin" | "agent_tip" | "online" | "other" | null;
  notes: string | null;

  transaction_type: "sale" | "rent" | "lease";
  categories: string[];
  property_types: string[];

  bhk_min: string | null;
  bhk_max: string | null;

  budget_min: number | null;
  budget_max: number | null;

  area_min: number | null;
  area_max: number | null;
  area_unit: string | null;

  localities: string[];
  city: string | null;

  urgency: Urgency | null;
  status: RequirementStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export const URGENCY_META: Record<Urgency, { label: string; blurb: string }> = {
  immediate: { label: "Immediate", blurb: "Ready to close now" },
  soon:      { label: "1–3 months", blurb: "Actively looking" },
  exploring: { label: "Exploring", blurb: "No rush yet" },
};

export const REQUIREMENT_STATUS_META: Record<
  RequirementStatus,
  { label: string; variant: "success" | "muted" | "outline" }
> = {
  active:    { label: "Active",    variant: "success" },
  fulfilled: { label: "Fulfilled", variant: "muted"   },
  dropped:   { label: "Dropped",   variant: "outline" },
};
