"use client";

// Inline quick-approve / quick-reject buttons for the pending analyses queue.
// Uses the first person in the org as the decider (no auth layer yet).
// Opens a small inline form for notes before submitting.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "./Toast";

const OUTCOMES = ["ACCEPTED", "REJECTED", "NEGOTIATED", "ESCALATED", "DEFERRED"] as const;

export function QuickDecisionButtons({
  organisationId,
  analysisId,
  documentTitle,
}: {
  organisationId: string;
  analysisId: string;
  documentTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("ACCEPTED");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function submit() {
    setSubmitting(true);
    try {
      // Fetch the first active person as the decider
      const peopleRes = await fetch(`/api/people?organisationId=${organisationId}`);
      const peopleData = await peopleRes.json();
      const decider = peopleData.people?.[0];
      if (!decider) {
        setToast({ type: "error", message: "No people in organisation to record decision" });
        return;
      }

      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          analysisId,
          decidedById: decider.id,
          outcome,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to record decision");

      setToast({ type: "success", message: `${documentTitle}: ${outcome}` });
      setOpen(false);
      setNotes("");
      router.refresh();
    } catch (e) {
      setToast({
        type: "error",
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
        style={{ backgroundColor: "var(--success)" }}
      >
        Decide
      </button>
    );
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-text-primary focus:border-border-strong focus:outline-none";

  return (
    <>
      <div className="absolute right-4 z-30 mt-1 w-64 rounded-lg border border-border bg-surface-raised p-3 shadow-xl" style={{ marginTop: "8px" }}>
        <p className="mb-2 text-xs font-medium text-text-primary truncate">{documentTitle}</p>

        <label className="mb-2 block">
          <span className="mb-0.5 block text-[11px] text-text-secondary">Outcome</span>
          <select
            className={fieldCls}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as typeof outcome)}
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="mb-2 block">
          <span className="mb-0.5 block text-[11px] text-text-secondary">Notes (optional)</span>
          <textarea
            className={`${fieldCls} min-h-[48px]`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason…"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-md px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {submitting ? "Saving…" : `Confirm ${outcome}`}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
