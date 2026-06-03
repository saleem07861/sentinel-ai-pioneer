// Decisions — all human decisions + pending-analysis approval queue
// with quick-approve / quick-reject buttons.

import Link from "next/link";
import { getDefaultOrganisation } from "@/lib/org";
import { getDecisionsByOrg, getPendingAnalyses } from "@/services/decisionService";
import { PageHeader } from "@/components/PageHeader";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { Badge } from "@/components/Badge";
import { QuickDecisionButtons } from "@/components/QuickDecisionButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  const [decisions, pending] = await Promise.all([
    getDecisionsByOrg(org.id),
    getPendingAnalyses(org.id),
  ]);

  return (
    <div>
      <PageHeader title="Decisions" subtitle="Human approvals, rejections and escalations" />

      {/* Past decisions table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-semibold">Document</th>
              <th className="px-4 py-3 font-semibold">Outcome</th>
              <th className="px-4 py-3 font-semibold">Decided By</th>
              <th className="px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {decisions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">No decisions recorded yet.</td></tr>
            ) : (
              decisions.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    {d.analysis.document ? (
                      <Link href={`/documents/${d.analysis.document.id}`} className="font-medium text-text-primary hover:underline">{d.analysis.document.title}</Link>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3"><OutcomeBadge outcome={d.outcome} /></td>
                  <td className="px-4 py-3 text-text-secondary">{d.decidedBy ? `${d.decidedBy.firstName} ${d.decidedBy.lastName}` : "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(d.decidedAt).toLocaleDateString("en-GB")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pending analyses with quick-approve */}
      <h2 className="mb-3 mt-8 text-sm font-semibold text-text-primary">
        Pending Analyses ({pending.length})
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-semibold">Document</th>
              <th className="px-4 py-3 font-semibold">Provider</th>
              <th className="px-4 py-3 font-semibold">Risk Level</th>
              <th className="px-4 py-3 font-semibold">Run ID</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">All analyses have been reviewed.</td></tr>
            ) : (
              pending.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-text-primary">{a.document?.title ?? "—"}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{a.provider === "MOCK" ? "Summary Analysis" : a.provider}</Badge></td>
                  <td className="px-4 py-3"><RiskBadge riskLevel={a.riskLevel} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{a.runId ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {a.document ? (
                        <Link href={`/documents/${a.document.id}`} className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface">
                          Review
                        </Link>
                      ) : null}
                      <QuickDecisionButtons
                        organisationId={org.id}
                        analysisId={a.id}
                        documentTitle={a.document?.title ?? "Unknown"}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
