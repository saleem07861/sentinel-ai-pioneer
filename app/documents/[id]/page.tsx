// Document detail — guided review workspace with step-by-step workflow.
// Layout: Step indicator → Clauses (main) → AI Analysis + Decisions (sidebar).

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDocumentById, getDocumentRiskSummary } from "@/services/documentService";
import { getDocumentRiskScore } from "@/services/riskService";
import { getClauseReviewProgress } from "@/services/clauseService";
import { auth } from "@/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { AIAnalysisCard } from "@/components/AIAnalysisCard";
import { AuditTimeline } from "@/components/AuditTimeline";
import { RunAnalysisButton } from "@/components/RunAnalysisButton";
import { RecordDecisionForm } from "@/components/RecordDecisionForm";
import { ClauseReviewCard } from "@/components/ClauseReviewCard";
import { EditableTitle } from "@/components/EditableTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const doc = await getDocumentById(params.id);
  return { title: doc?.title ?? "Document" };
}

function scoreColor(score: number) {
  if (score < 40) return "var(--success)";
  if (score <= 70) return "var(--accent-amber)";
  return "var(--danger)";
}

interface StepDef { label: string; done: boolean; current: boolean; hint: string; }

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const document = await getDocumentById(params.id);
  if (!document) notFound();

  const session = await auth();
  const sessionEmail = (session?.user as { email?: string })?.email ?? null;
  const userName = session?.user?.name ?? null;

  // Resolve the real Person DB id from the session email (hardcoded demo IDs don't match Person table)
  const person = sessionEmail
    ? await prisma.person.findFirst({ where: { email: sessionEmail.toLowerCase(), isActive: true }, select: { id: true } })
    : null;
  const userId = person?.id ?? null;

  const [analyses, riskResult, summary, progress, prevVersion] = await Promise.all([
    prisma.aIAnalysis.findMany({
      where: { documentId: params.id },
      include: { humanDecisions: { include: { decidedBy: { select: { firstName: true, lastName: true } } }, orderBy: { decidedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    getDocumentRiskScore(params.id),
    getDocumentRiskSummary(params.id),
    getClauseReviewProgress(params.id),
    document.previousVersion
      ? prisma.document.findFirst({
          where: { id: document.previousVersion.id },
          select: { id: true, title: true, version: true, status: true },
        })
      : Promise.resolve(null),
  ]);

  const score = riskResult.score;
  const originalScore = riskResult.originalScore;
  const decisions = analyses.flatMap((a) => a.humanDecisions);
  const resolved = document.status === "APPROVED" || document.status === "REJECTED";
  const archived = document.status === "ARCHIVED";
  const metadata = document.metadata as Record<string, unknown> | null;
  const hasClauses = document.clauses.length > 0;
  const hasAnalysis = analyses.length > 0;
  const identicalMatch = resolved && hasClauses && document.clauses.every((c) => c.status === "STANDARD");

  // Determine current step
  const steps: StepDef[] = [
    { label: "Uploaded", done: true, current: false, hint: "Document uploaded" },
    { label: "AI Analysis", done: hasAnalysis, current: hasClauses && !hasAnalysis && !resolved, hint: "Run AI to extract & classify clauses" },
    { label: "Review Clauses", done: progress.accepted > 0, current: hasAnalysis && !progress.allAccepted && !resolved, hint: "Accept, edit, or flag each clause" },
    { label: "Decide", done: decisions.length > 0 || (hasAnalysis && progress.allAccepted), current: hasAnalysis && progress.allAccepted && !resolved, hint: "Approve or reject the document" },
    { label: resolved ? "Resolved" : archived ? "Archived" : "Complete", done: resolved || archived, current: false, hint: resolved ? "Document is finalised" : "" },
  ];

  return (
    <div>
      {/* Title row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <EditableTitle documentId={document.id} initialTitle={document.title} />
        <StatusBadge status={document.status} />
        <RiskBadge riskLevel={document.riskLevel} />
        {document.version > 1 ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">v{document.version}</span>
        ) : null}
        {prevVersion ? (
          <Link
            href={`/documents/${prevVersion.id}`}
            className="rounded-md border border-border px-2.5 py-0.5 text-xs text-text-secondary hover:bg-surface"
          >
            ← v{prevVersion.version}
          </Link>
        ) : null}
      </div>

      {/* Identical match banner */}
      {identicalMatch ? (
        <div
          className="mb-4 flex items-center gap-3 rounded-lg border-2 px-4 py-3"
          style={{ borderColor: "var(--success)", backgroundColor: "#E8F5E9" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5 shrink-0" style={{ color: "var(--success)" }}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--success)" }}>
              Identical to Standard Template — Auto-Approved
            </p>
            <p className="text-xs text-text-secondary">
              All {document.clauses.length} clauses match the template exactly. Risk score: 0. No review needed.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`/api/documents/${document.id}/download`}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: "var(--success)" }}
              download
            >
              Download
            </a>
          </div>
        </div>
      ) : null}

      {/* Metadata bar */}
      {metadata && (metadata.parties || metadata.contractType) ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm shadow-sm">
          {metadata.contractType ? (
            <span className="font-medium text-text-primary">{String(metadata.contractType)}</span>
          ) : null}
          {metadata.parties ? (
            <span className="text-text-secondary">
              {Array.isArray(metadata.parties)
                ? (metadata.parties as string[]).join(" · ")
                : String(metadata.parties)}
            </span>
          ) : null}
          {metadata.effectiveDate ? (
            <span className="text-text-muted">{String(metadata.effectiveDate)}</span>
          ) : null}
        </div>
      ) : null}

      {/* Step-by-step workflow indicator */}
      <div className="mb-6 rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Workflow</h2>
        <div className="flex flex-wrap items-center gap-1">
          {steps.filter(s => s.label !== "Complete" || resolved || archived).map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  step.current
                    ? "text-white"
                    : step.done
                    ? "bg-surface text-text-secondary"
                    : "text-text-muted"
                }`}
                style={step.current ? { backgroundColor: "var(--accent)" } : undefined}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  step.done ? "text-white" : step.current ? "text-white" : "text-text-muted"
                }`}
                style={step.done && !step.current ? { backgroundColor: "var(--success)" } : step.current ? {} : { border: "1px solid var(--border-strong)" }}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                {step.label}
              </div>
              {i < arr.length - 1 ? (
                <span className="text-text-muted mx-0.5">→</span>
              ) : null}
            </div>
          ))}
        </div>
        {/* Show hint for current step */}
        {steps.find(s => s.current)?.hint ? (
          <p className="mt-2 text-xs font-medium" style={{ color: "var(--accent)" }}>
            Next: {steps.find(s => s.current)?.hint}
          </p>
        ) : null}
      </div>

      {/* Clause review progress bar — only show if clauses exist */}
      {hasClauses ? (
        <div className="mb-4 rounded-lg border border-border bg-surface-raised p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">Review Progress</span>
            <span className="text-text-muted">
              {progress.total === 0
                ? "All clauses match standard — no review needed"
                : `${progress.accepted} / ${progress.total} clauses reviewed`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: progress.total === 0 ? "100%" : `${progress.total > 0 ? (progress.accepted / progress.total) * 100 : 0}%`,
                backgroundColor: progress.allAccepted ? "var(--success)" : "var(--accent)",
              }}
            />
          </div>
          {progress.allAccepted ? (
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--success)" }}>
              ✓ All clauses reviewed — ready for decision.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Download + Archive bar */}
      {(document.approvedContent || progress.allAccepted || resolved) && !archived ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <a
            href={`/api/documents/${document.id}/download`}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: "var(--success)" }}
            download
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Document
          </a>
        </div>
      ) : null}

      {/* Main content: two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT + CENTRE — Clauses (spans 2 cols on desktop) */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Clauses ({document.clauses.filter(c => c.status !== "STANDARD").length} need review, {document.clauses.filter(c => c.status === "STANDARD").length} standard)
            </h2>
            {!hasClauses && !hasAnalysis ? (
              <RunAnalysisButton documentId={document.id} actorId={document.uploadedById} />
            ) : null}
          </div>

          {!hasClauses ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-raised p-8 text-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 h-8 w-8 text-text-muted">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p className="mb-2 text-sm font-medium text-text-primary">No clauses extracted yet</p>
              <p className="mb-4 text-xs text-text-muted">
                Run the AI analysis to automatically extract and classify clauses from this document.
              </p>
              <RunAnalysisButton documentId={document.id} actorId={document.uploadedById} />
            </div>
          ) : (
            <div className="space-y-3">
              {document.clauses
                .filter((c) => c.status !== "STANDARD")
                .map((c) => (
                <ClauseReviewCard
                  key={c.id}
                  clause={{
                    id: c.id,
                    title: c.title,
                    content: c.content,
                    templateClause: c.templateClause,
                    status: c.status,
                    riskLevel: c.riskLevel,
                    riskNote: c.riskNote,
                    orderIndex: c.orderIndex,
                    editedContent: c.editedContent,
                    reviewStatus: c.reviewStatus,
                  }}
                  documentStatus={document.status}
                  actorId={document.uploadedById}
                  organisationId={document.organisationId}
                />
              ))}
            </div>
          )}
        </section>

        {/* RIGHT — Summary Analysis + Risk + Decisions sidebar */}
        <section className="space-y-4">
          {/* Summary Analysis section */}
          <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Summary Analysis</h2>
              {hasClauses && !hasAnalysis ? <RunAnalysisButton documentId={document.id} actorId={document.uploadedById} /> : null}
            </div>
            {analyses.length === 0 ? (
              <p className="text-xs text-text-muted">Analysis will run automatically on upload.</p>
            ) : (
              analyses.map((a) => <AIAnalysisCard key={a.id} analysis={a} />)
            )}
          </div>

          {/* Risk score */}
          <div className="rounded-lg border border-border bg-surface-raised p-4 text-center shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-text-muted">Risk Score</div>
            <div className="mt-1 text-5xl font-bold" style={{ color: scoreColor(score) }}>{score}</div>
            <div className="text-xs text-text-muted">out of 100 · {summary.totalClauses} clauses</div>
            {originalScore > score ? (
              <div className="mt-1 text-[11px] font-medium" style={{ color: "var(--success)" }}>
                ↓ from {originalScore} — {progress.accepted} clauses reviewed
              </div>
            ) : null}
          </div>

          {/* Final Decision callout — only visible when all clauses accepted */}
          {progress.allAccepted && !resolved && !archived ? (
            <div
              className="rounded-lg border-2 p-4 text-center shadow-sm"
              style={{ borderColor: "var(--accent)", backgroundColor: "#EEF4FC" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2 h-6 w-6" style={{ color: "var(--accent)" }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                Ready for Final Decision
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                All clauses have been reviewed. Record your final decision below.
              </p>
              <RecordDecisionForm
                organisationId={document.organisationId}
                analyses={analyses.map((a) => ({ id: a.id, label: `${a.riskLevel ?? "—"} · ${a.runId ?? a.id.slice(0, 8)}` }))}
                userId={userId}
                userName={userName}
              />
            </div>
          ) : null}

          {/* Decisions history */}
          {decisions.length > 0 ? (
            <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Decision History</h2>
              <ul className="space-y-3">
                {decisions.map((d) => (
                  <li key={d.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <OutcomeBadge outcome={d.outcome} />
                      <span className="text-xs text-text-muted">{new Date(d.decidedAt).toLocaleDateString("en-GB")}</span>
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">{d.decidedBy ? `${d.decidedBy.firstName} ${d.decidedBy.lastName}` : "Unknown"}</div>
                    {d.notes ? <p className="mt-1 text-sm text-text-primary">{d.notes}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
