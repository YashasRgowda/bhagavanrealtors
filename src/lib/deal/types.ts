import type { StageKey } from "./stages";

/** Value stored per doc_row field. */
export type DocRowValue = {
  ok?: boolean;
  storage_path?: string;
  filename?: string;
  bytes?: number;
  uploaded_at?: string;
};

export type StepValue = {
  done: boolean;
  values: Record<string, unknown>;   // per-field data (mixed kinds incl. DocRowValue for doc_row)
  attachments?: string[];            // (legacy — kept for compatibility)
  updated_at?: string;
};

export type DealSteps = Partial<Record<StageKey, StepValue>>;

export type DealRow = {
  id: string;
  property_id: string;
  owner_user_id: string;
  deal_type: "sale" | "rent" | "lease";
  buyer_name: string | null;
  buyer_phone: string | null;
  agreed_amount: number | null;
  current_stage: StageKey | null;
  steps: DealSteps;
  brokerage_received: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};
