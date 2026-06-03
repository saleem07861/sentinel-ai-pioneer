// Dashboard — operations centre with quick actions and key information.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { getDefaultOrganisation } from "@/lib/org";
import { getDashboardData } from "@/services/dashboardService";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found. Seed the database first.</p>;

  const d = await getDashboardData(org.id);

  return (
    <div>
      <PageHeader title={`${org.name}`} subtitle="Contract Review Operations Centre" />

      {/* Quick-action cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/documents" className="group rounded-lg border border-border bg-surface-raised p-4 shadow-sm hover:border-border-strong transition-colors">
          <div className="text-2xl font-bold text-text-primary">{d.totalDocuments}</div>
          <div className="mt-1 text-xs text-text-muted">Total Documents</div>
          {d.documentsUnderReview > 0 ? (
            <div className="mt-2 text-xs font-medium" style={{ color: "var(--accent-amber)" }}>{d.documentsUnderReview} need review →</div>
          ) : null}
        </Link>

        <Link href="/documents?status=UNDER_REVIEW" className="group rounded-lg border border-border bg-surface-raised p-4 shadow-sm hover:border-border-strong transition-colors">
          <div className="text-2xl font-bold" style={{ color: d.documentsUnderReview > 0 ? "var(--accent-amber)" : "var(--text-primary)" }}>{d.documentsUnderReview}</div>
          <div className="mt-1 text-xs text-text-muted">Under Review</div>
          <div className="mt-2 text-xs text-text-secondary">View documents →</div>
        </Link>

        <Link href="/clauses" className="group rounded-lg border border-border bg-surface-raised p-4 shadow-sm hover:border-border-strong transition-colors">
          <div className="text-2xl font-bold" style={{ color: d.highRiskDocuments > 0 ? "var(--danger)" : "var(--text-primary)" }}>{d.highRiskDocuments}</div>
          <div className="mt-1 text-xs text-text-muted">High Risk</div>
          <div className="mt-2 text-xs text-text-secondary">View flagged clauses →</div>
        </Link>

        <Link href="/decisions" className="group rounded-lg border border-border bg-surface-raised p-4 shadow-sm hover:border-border-strong transition-colors">
          <div className="text-2xl font-bold" style={{ color: d.pendingDecisions > 0 ? "var(--accent)" : "var(--text-primary)" }}>{d.pendingDecisions}</div>
          <div className="mt-1 text-xs text-text-muted">Pending Decisions</div>
          <div className="mt-2 text-xs text-text-secondary">Review queue →</div>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent documents needing attention */}
        <section className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Documents</h2>
            <Link href="/documents" className="text-xs font-medium text-text-secondary hover:underline" style={{ textDecorationColor: "var(--accent)" }}>View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-2 py-2 font-semibold">Title</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {d.recentDocuments.slice(0, 10).map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-2 py-2">
                      <Link href={`/documents/${doc.id}`} className="text-text-primary hover:underline text-sm" style={{ textDecorationColor: "var(--accent)" }}>
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-2 py-2"><StatusBadge status={doc.status} /></td>
                    <td className="px-2 py-2"><RiskBadge riskLevel={doc.riskLevel} /></td>
                  </tr>
                ))}
                {d.recentDocuments.length === 0 ? (
                  <tr><td colSpan={3} className="px-2 py-4 text-center text-text-muted">No documents yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* Knowledge + Decisions summary */}
        <section className="space-y-4">
          <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-text-primary">Knowledge Base</h2>
              <Link href="/knowledge" className="text-xs font-medium text-text-secondary hover:underline" style={{ textDecorationColor: "var(--accent)" }}>Browse →</Link>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-text-primary">{d.knowledgeEntries}</div>
                <div className="text-xs text-text-muted">Best practices</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">{d.approvedClauses}</div>
                <div className="text-xs text-text-muted">Approved clauses</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-text-primary">Decisions</h2>
              <Link href="/decisions" className="text-xs font-medium text-text-secondary hover:underline" style={{ textDecorationColor: "var(--accent)" }}>View all →</Link>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold" style={{ color: "var(--success)" }}>{d.completedDecisions}</div>
                <div className="text-xs text-text-muted">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: d.pendingDecisions > 0 ? "var(--accent)" : "var(--text-primary)" }}>{d.pendingDecisions}</div>
                <div className="text-xs text-text-muted">Pending</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
