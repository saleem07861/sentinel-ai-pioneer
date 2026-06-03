// Displays one AIAnalysis record — branded as "Summary Analysis".

import { RiskBadge } from "./RiskBadge";

interface AIAnalysisLike {
  id: string;
  provider: string;
  confidence: number | null;
  findings: string;
  suggestedResponse: string | null;
  riskLevel: string | null;
  runId: string | null;
  createdAt: Date | string;
}

export function AIAnalysisCard({ analysis }: { analysis: AIAnalysisLike }) {
  const confidencePct =
    analysis.confidence != null ? `${Math.round(analysis.confidence * 100)}%` : "—";

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Summary Analysis
          </span>
          <RiskBadge riskLevel={analysis.riskLevel} />
        </div>
        <div className="text-xs text-text-muted">
          {confidencePct} confidence
        </div>
      </div>

      <div className="mt-3">
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
          {analysis.findings}
        </p>
      </div>

      {analysis.suggestedResponse ? (
        <div
          className="mt-3 rounded-md border px-3 py-2"
          style={{
            borderColor: "#C4D9F6",
            backgroundColor: "#EEF4FC",
            borderLeftColor: "var(--accent)",
            borderLeftWidth: 3,
          }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Suggested Action
          </div>
          <p className="mt-1 text-sm leading-relaxed text-text-primary">
            {analysis.suggestedResponse}
          </p>
        </div>
      ) : null}

      <div className="mt-3 border-t border-border pt-2 text-xs text-text-muted">
        <span className="font-mono">{analysis.runId ?? "—"}</span>
      </div>
    </div>
  );
}
