// Clauses — flagged / deviation clauses (HIGH or CRITICAL) from unresolved
// documents only. Resolved (APPROVED / REJECTED / ARCHIVED) documents are excluded.

import Link from "next/link";
import { ClauseStatus, DocumentStatus, RiskLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganisation } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clauses" };

/** Statuses that represent documents still in the review pipeline. */
const UNRESOLVED: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.UNDER_REVIEW,
  DocumentStatus.REVIEWED,
];

export default async function ClausesPage() {
  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  const clauses = await prisma.clause.findMany({
    where: {
      organisationId: org.id,
      status: { in: [ClauseStatus.FLAGGED, ClauseStatus.DEVIATION] },
      riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
      document: { status: { in: UNRESOLVED } },
    },
    include: { document: { select: { id: true, title: true, status: true } } },
    orderBy: [{ riskLevel: "desc" }, { documentId: "asc" }, { orderIndex: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Clauses" subtitle="Flagged and deviation clauses at HIGH or CRITICAL risk from documents still in review" />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-semibold">Clause Title</th>
              <th className="px-4 py-3 font-semibold">Document</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Risk Level</th>
              <th className="px-4 py-3 font-semibold">Risk Note</th>
            </tr>
          </thead>
          <tbody>
            {clauses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">No flagged or deviation clauses in unresolved documents.</td></tr>
            ) : (
              clauses.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/documents/${c.document.id}#clause-${c.id}`} className="font-medium text-text-primary hover:underline">{c.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{c.document.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3"><RiskBadge riskLevel={c.riskLevel} /></td>
                  <td className="px-4 py-3 text-text-secondary">{c.riskNote ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
