"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Pencil, Trash2, Check, AlertTriangle } from "lucide-react";
import {
  REQUIREMENT_STATUS_META, type RequirementRow, type RequirementStatus,
} from "@/lib/requirement/types";

/**
 * Everything that changes this buyer, in one card.
 *
 * Previously three stacked cards — a read-only "Status" row, a second card to
 * change that same status, then a third for edit/delete. Status appeared twice
 * on one screen, which is the kind of thing that makes a page feel confusing
 * without anyone being able to say why.
 */
export function RequirementActions({ requirement }: { requirement: RequirementRow }) {
  const router = useRouter();
  const [status, setStatus] = useState<RequirementStatus>(requirement.status);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = status !== requirement.status;

  async function saveStatus() {
    if (!dirty) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/requirements/${requirement.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Could not update");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/requirements/${requirement.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Delete failed");
      router.replace("/requirements");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-5 p-5">
        <h2 className="text-micro uppercase text-ink-muted">Manage</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="req-status" className="text-sm font-medium text-ink">
            Status
          </label>
          <div className="flex items-center gap-2">
            <Select
              id="req-status"
              className="flex-1"
              value={status}
              onChange={e => setStatus(e.target.value as RequirementStatus)}
            >
              {(Object.keys(REQUIREMENT_STATUS_META) as RequirementStatus[]).map(s => (
                <option key={s} value={s}>{REQUIREMENT_STATUS_META[s].label}</option>
              ))}
            </Select>
            <Button
              variant={dirty ? "primary" : "outline"}
              onClick={saveStatus}
              disabled={busy || !dirty}
              loading={busy && dirty}
              className="shrink-0"
            >
              <Check aria-hidden /> Save
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line-subtle pt-5">
          <Link href={`/requirements/${requirement.id}/edit`} className="block">
            <Button variant="outline" block>
              <Pencil aria-hidden /> Edit requirement
            </Button>
          </Link>
          <Button
            variant="destructive-ghost"
            block
            onClick={() => setConfirming(true)}
          >
            <Trash2 aria-hidden /> Delete buyer
          </Button>
        </div>

        {err && (
          <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger-text">
            {err}
          </p>
        )}
      </Card>

      <Sheet
        open={confirming}
        onOpenChange={o => { if (!busy) setConfirming(o); }}
        title="Delete this buyer?"
        description={`${requirement.buyer_name} and their requirement are erased for good, and they stop appearing in property matches.`}
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" block onClick={() => setConfirming(false)} disabled={busy}>
              Keep
            </Button>
            <Button variant="destructive" block onClick={remove} loading={busy}>
              <Trash2 aria-hidden /> Delete
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-subtle p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-text" strokeWidth={1.75} aria-hidden />
          <p className="text-sm text-danger-text">
            This cannot be undone. To keep the record instead, set the status to{" "}
            <strong className="font-semibold">Fulfilled</strong> or{" "}
            <strong className="font-semibold">Dropped</strong>.
          </p>
        </div>
      </Sheet>
    </>
  );
}
