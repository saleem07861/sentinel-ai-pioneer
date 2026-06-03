// Documents list with status / risk filters (driven by URL search params).
// Defaults to unresolved documents (UPLOADED, UNDER_REVIEW, REVIEWED) —
// pass ?status=APPROVED (etc.) to view resolved documents.

import Link from "next/link";
import { DocumentStatus, ModuleType, RiskLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganisation } from "@/lib/org";
import { auth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { DocumentFilters } from "@/components/DocumentFilters";
import { DocumentActions } from "@/components/DocumentActions";
import { UploadContract } from "@/components/UploadContract";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents" };

/** Statuses that represent documents still in the review pipeline. */
const UNRESOLVED: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.UNDER_REVIEW,
  DocumentStatus.REVIEWED,
];

function asEnum<T extends Record<string, string>>(e: T, v?: string): T[keyof T] | undefined {
  return v && (Object.values(e) as string[]).includes(v) ? (v as T[keyof T]) : undefined;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { status?: string; riskLevel?: string };
}) {
  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  const status = asEnum(DocumentStatus, searchParams.status);
  const riskLevel = asEnum(RiskLevel, searchParams.riskLevel);

  const session = await auth();
  const [legalModule, uploader, templates] = await Promise.all([
    prisma.module.findFirst({ where: { organisationId: org.id, type: ModuleType.LEGAL }, select: { id: true } }),
    session?.user?.email
      ? prisma.person.findFirst({ where: { organisationId: org.id, email: session.user.email, isActive: true }, select: { id: true } })
      : Promise.resolve(null),
    prisma.template.findMany({ where: { organisationId: org.id, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // When a specific status filter is supplied, use it exactly.
  // When none given, default to unresolved documents only.
  const statusWhere = status ? { status } : { status: { in: UNRESOLVED } };

  const documents = await prisma.document.findMany({
    where: { organisationId: org.id, isActive: true, ...statusWhere, ...(riskLevel ? { riskLevel } : {}) },
    include: { module: { select: { name: true, type: true } }, uploadedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Contracts and documents submitted for review"
        action={
          legalModule ? (
            <UploadContract
              organisationId={org.id}
              moduleId={legalModule.id}
              uploadedById={uploader?.id ?? null}
              templates={templates}
            />
          ) : null
        }
      />
      <DocumentFilters />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Parties</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Risk Level</th>
              <th className="px-4 py-3 font-semibold">Uploaded By</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-text-muted">No documents match these filters.</td></tr>
            ) : (
              documents.map((doc) => {
                const meta = doc.metadata as Record<string, unknown> | null;
                const parties = meta?.parties && Array.isArray(meta.parties) ? (meta.parties as string[]).join(" · ") : null;
                return (
                <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/documents/${doc.id}`} className="font-medium text-text-primary hover:underline" style={{ textDecorationColor: "var(--accent)" }}>
                      {doc.title}
                    </Link>
                    {doc.version > 1 ? <span className="ml-1.5 text-xs text-text-muted">v{doc.version}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{parties ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                  <td className="px-4 py-3"><RiskBadge riskLevel={doc.riskLevel} /></td>
                  <td className="px-4 py-3 text-text-secondary">{doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(doc.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.status !== "APPROVED" && doc.status !== "REJECTED" ? (
                        <Link
                          href={`/documents/${doc.id}`}
                          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          Review →
                        </Link>
                      ) : (
                        <Link
                          href={`/documents/${doc.id}`}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface"
                        >
                          View
                        </Link>
                      )}
                      <DocumentActions
                        documentId={doc.id}
                        documentTitle={doc.title}
                        status={doc.status}
                        canDownload={doc.status === "APPROVED"}
                      />
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
