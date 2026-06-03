// Clean side-by-side comparison between the standard template clause and the
// submitted clause. Shows section titles on both sides, coloured status border
// on the submitted panel, and an AI assessment box below.

"use client";

const STATUS_META: Record<string, { accent: string; label: string; bg: string }> = {
  DEVIATION: { accent: "var(--accent-amber)", label: "Deviation", bg: "#FFF8E1" },
  FLAGGED: { accent: "var(--danger)", label: "Flagged", bg: "#FFEBEE" },
  MISSING: { accent: "var(--danger)", label: "Missing", bg: "#FFEBEE" },
  STANDARD: { accent: "var(--success)", label: "Standard", bg: "#E8F5E9" },
  ACCEPTABLE: { accent: "var(--success)", label: "Acceptable", bg: "#E8F5E9" },
};

function stripPrefix(title: string): string {
  return title.replace(/^\d+\.\s*/, "");
}

export function DiffBlock({
  templateClause,
  content,
  clauseTitle,
  status,
  riskNote,
}: {
  templateClause?: string | null;
  content: string;
  clauseTitle: string;
  status?: string;
  riskNote?: string | null;
}) {
  const meta = status ? STATUS_META[status] : undefined;

  // Extract template body (strip the "1. TITLE\n" prefix if present)
  let tmplBody = templateClause ?? "";
  if (tmplBody.includes("\n")) {
    const nl = tmplBody.indexOf("\n");
    tmplBody = tmplBody.slice(nl + 1).trim();
  }

  const cleanTitle = stripPrefix(clauseTitle);

  return (
    <div className="mt-3 space-y-3">
      {/* Status chip */}
      {meta && (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: meta.accent }}
          >
            {meta.label}
          </span>
          {status === "STANDARD" && (
            <span className="text-[11px] text-text-muted">
              Matches approved template — no action needed
            </span>
          )}
          {status === "DEVIATION" && (
            <span className="text-[11px] font-medium" style={{ color: "var(--accent-amber)" }}>
              Differs from standard — review required
            </span>
          )}
          {status === "FLAGGED" && (
            <span className="text-[11px] font-medium" style={{ color: "var(--danger)" }}>
              Unacceptable deviation — escalate
            </span>
          )}
        </div>
      )}

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Standard (left) */}
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: "var(--success)" }}
            >
              Standard
            </span>
            <span className="text-xs font-medium text-text-primary">{cleanTitle}</span>
          </div>
          {templateClause ? (
            <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
              {tmplBody}
            </p>
          ) : (
            <p className="text-xs italic text-text-muted">
              No matching standard clause in template.
            </p>
          )}
        </div>

        {/* Submitted (right) */}
        <div
          className="rounded-lg border bg-surface-raised p-3"
          style={
            meta
              ? {
                  borderColor: "var(--border)",
                  borderLeftColor: meta.accent,
                  borderLeftWidth: "3px",
                  backgroundColor: meta.bg,
                }
              : { borderColor: "var(--border)" }
          }
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: meta?.accent ?? "var(--text-muted)" }}
            >
              Submitted
            </span>
            <span className="text-xs font-medium text-text-primary">{cleanTitle}</span>
          </div>
          <p className="text-xs leading-relaxed text-text-primary whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>

      {/* AI Assessment */}
      {riskNote && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: "#F6D9A8",
            backgroundColor: "#FEF3E2",
            borderLeftColor: "var(--accent-amber)",
            borderLeftWidth: 3,
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent-amber)" }}>
              AI Assessment
            </span>
          </div>
          <p className="text-xs leading-relaxed text-text-primary">{riskNote}</p>
        </div>
      )}
    </div>
  );
}
