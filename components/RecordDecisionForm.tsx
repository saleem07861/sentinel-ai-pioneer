"use client";

// "Record Decision" form. Decision maker is auto-set to the logged-in user.
// Only visible when all clauses are accepted.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "./Toast";

const OUTCOMES = ["ACCEPTED", "REJECTED", "NEGOTIATED", "ESCALATED", "DEFERRED"] as const;

interface AnalysisOption {
  id: string;
  label: string;
}

export function RecordDecisionForm({
  organisationId,
  analyses,
  userId,
  userName,
}: {
  organisationId: string;
  analyses: AnalysisOption[];
  userId: string | null;
  userName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [analysisId, setAnalysisId] = useState(analyses[0]?.id ?? "");
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("ACCEPTED");
  const [notes, setNotes] = useState("");

  if (analyses.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No analysis available to decide on.
      </p>
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          analysisId,
          decidedById: userId,
          outcome,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to record decision");
      setToast({ type: "success", message: `Decision recorded: ${outcome}` });
      setOpen(false);
      setNotes("");
      router.refresh();
    } catch (e) {
      setToast({
        type: "error",
        message: e instanceof Error ? e.message : "Failed to record decision",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-md px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Record Final Decision
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-md border border-border bg-surface p-3 text-left">
          {/* Who is deciding (auto-set, read-only display) */}
          {userName && (
            <div className="flex items-center gap-2 rounded-md bg-surface-raised px-3 py-2 text-xs text-text-secondary">
              <span className="font-medium text-text-primary">Deciding as:</span> {userName}
            </div>
          )}

          {analyses.length > 1 ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">Analysis</span>
              <select className={fieldCls} value={analysisId} onChange={(e) => setAnalysisId(e.target.value)}>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Outcome</span>
            <select className={fieldCls} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Notes (optional)</span>
            <textarea
              className={`${fieldCls} min-h-[60px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for this decision…"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={submitting || !userId || !analysisId}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {submitting ? "Submitting…" : `Confirm ${outcome}`}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-surface-raised"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
