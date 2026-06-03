"use client";

// Per-clause review card — side-by-side edit mode keeps original visible.
// Accept / Edit (with original comparison) / Flag controls.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";
import { DiffBlock } from "./DiffBlock";
import { Toast, type ToastState } from "./Toast";
import type { ReviewStatus } from "@prisma/client";

interface ClauseReviewCardProps {
  clause: {
    id: string;
    title: string;
    content: string;
    templateClause?: string | null;
    status: string;
    riskLevel?: string | null;
    riskNote?: string | null;
    orderIndex: number;
    editedContent?: string | null;
    reviewStatus: ReviewStatus;
  };
  documentStatus: string;
  actorId?: string | null;
  organisationId?: string | null;
}

const REVIEW_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "var(--text-muted)" },
  ACCEPTED: { label: "Accepted", color: "var(--success)" },
  EDITED: { label: "Edited", color: "var(--accent-amber)" },
  FLAGGED: { label: "Flagged", color: "var(--danger)" },
};

export function ClauseReviewCard({ clause, documentStatus, actorId, organisationId }: ClauseReviewCardProps) {
  const router = useRouter();
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(clause.reviewStatus);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(clause.editedContent ?? clause.content);
  const [submitting, setSubmitting] = useState(false);
  const [savingToKb, setSavingToKb] = useState(false);
  const [savedToKb, setSavedToKb] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const isResolved = documentStatus === "APPROVED" || documentStatus === "REJECTED";
  const reviewMeta = REVIEW_LABELS[reviewStatus] ?? REVIEW_LABELS.PENDING;
  const leftBorder = reviewStatus === "ACCEPTED" ? "var(--success)" : reviewStatus === "FLAGGED" ? "var(--danger)" : reviewStatus === "EDITED" ? "var(--accent-amber)" : "transparent";

  async function saveToKnowledgeBase() {
    setSavingToKb(true);
    try {
      const res = await fetch("/api/knowledge-base/clauses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId,
          title: clause.title,
          content: clause.editedContent ?? clause.content,
          category: clause.title,
          tags: ["approved-edit"],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSavedToKb(true);
      setToast({ type: "success", message: "Added to approved clauses — will match future contracts" });
    } catch { setToast({ type: "error", message: "Failed to save" }); }
    finally { setSavingToKb(false); }
  }

  async function submitReview(status: ReviewStatus, content?: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clauses/${clause.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, editedContent: content ?? null, actorId: actorId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setReviewStatus(status);
      if (content != null) setEditedText(content);
      setEditing(false);
      setToast({ type: "success", message: `Clause ${clause.orderIndex}: ${status}` });
      router.refresh();
    } catch (e) { setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" }); }
    finally { setSubmitting(false); }
  }

  return (
    <div id={`clause-${clause.id}`} className="scroll-mt-20 rounded-lg border border-border bg-surface-raised shadow-sm" style={{ borderLeftColor: leftBorder, borderLeftWidth: leftBorder !== "transparent" ? "3px" : "1px" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{clause.orderIndex}. {clause.title}</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: reviewMeta.color }}>{reviewMeta.label}</span>
          {/* Help tooltip */}
          <button onClick={() => setShowHelp(!showHelp)} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] text-text-muted hover:bg-surface hover:text-text-primary" title="What does this mean?">?</button>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={clause.status} />
          <RiskBadge riskLevel={clause.riskLevel} />
        </div>
      </div>

      {/* Help tooltip content */}
      {showHelp ? (
        <div className="mx-4 mt-3 rounded-md border px-3 py-2 text-xs leading-relaxed" style={{ borderColor: "#C4D9F6", backgroundColor: "#EEF4FC" }}>
          <strong>Status:</strong> {clause.status === "STANDARD" ? "Matches approved template — no action needed." : clause.status === "DEVIATION" ? "Differs from template — review and decide." : clause.status === "MISSING" ? "No equivalent in template — must be added." : clause.status === "FLAGGED" ? "Unacceptable deviation — escalate." : "Acceptable with minor edits."}<br />
          <strong>Actions:</strong> <span style={{color:"var(--success)"}}>Accept</span> = approve as-is. <span style={{color:"var(--accent-amber)"}}>Edit</span> = modify text, then save. <span style={{color:"var(--danger)"}}>Flag</span> = escalate for renegotiation.
        </div>
      ) : null}

      {/* Content */}
      <div className="p-4">
        {editing ? (
          /* Side-by-side: comparison on left, editable on right */
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              {clause.templateClause ? (
                <div className="mb-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Standard (Approved Template)</div>
                  <div className="rounded-md border p-3 text-xs text-text-secondary whitespace-pre-wrap" style={{ borderColor: "var(--success)", backgroundColor: "#E8F5E9" }}>{clause.templateClause}</div>
                </div>
              ) : null}
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Submitted Clause</div>
                <div className="rounded-md border border-border bg-surface p-3 text-sm text-text-secondary whitespace-pre-wrap min-h-[80px]">{clause.content}</div>
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>Your Edit</div>
              <textarea className="w-full rounded-md border-2 bg-surface-raised p-3 text-sm text-text-primary focus:outline-none min-h-[120px]" style={{ borderColor: "var(--accent)" }} rows={5} value={editedText} onChange={(e) => setEditedText(e.target.value)} placeholder="Modify the clause text here…" />
            </div>
          </div>
        ) : clause.templateClause ? (
          <DiffBlock templateClause={clause.templateClause} content={clause.editedContent ?? clause.content} clauseTitle={clause.title} status={clause.status} riskNote={clause.riskNote} />
        ) : (
          <>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{clause.editedContent ?? clause.content}</p>
            {clause.riskNote ? (
              <div className="mt-2 rounded-md border px-3 py-2 text-sm text-text-primary" style={{ borderColor: "#F6D9A8", backgroundColor: "#FEF3E2", borderLeftColor: "var(--accent-amber)", borderLeftWidth: 3 }}>{clause.riskNote}</div>
            ) : null}
            {clause.editedContent && !editing ? (
              <div className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted"><span className="font-medium">Original:</span> {clause.content.slice(0, 200)}{clause.content.length > 200 ? "…" : ""}</div>
            ) : null}
          </>
        )}

        {/* Action buttons — only for clauses that need review */}
        {!isResolved && clause.status !== "STANDARD" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {editing ? (
              <>
                <button onClick={() => submitReview("EDITED", editedText)} disabled={submitting} className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "var(--accent-amber)" }}>{submitting ? "Saving…" : "Save Edit"}</button>
                <button onClick={() => { setEditing(false); setEditedText(clause.editedContent ?? clause.content); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface">Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => submitReview("ACCEPTED")} disabled={submitting || reviewStatus === "ACCEPTED"} className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "var(--success)" }}>✓ Accept</button>
                <button onClick={() => setEditing(true)} disabled={submitting} className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface">✎ Edit</button>
                <button onClick={() => submitReview("FLAGGED")} disabled={submitting || reviewStatus === "FLAGGED"} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-surface" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>⚑ Flag</button>
                {(reviewStatus === "ACCEPTED" || reviewStatus === "EDITED") && organisationId && !savedToKb ? (
                  <button onClick={saveToKnowledgeBase} disabled={savingToKb} className="ml-auto rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface disabled:opacity-60">{savingToKb ? "Saving…" : "Save for future contracts"}</button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
