// Audit — the immutable audit log (newest first, last 50).
// Admin + Team Leader only.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganisation } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { ActionBadge } from "@/components/ActionBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit" };

export default async function AuditPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "teamLeader") redirect("/");

  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  const events = await prisma.auditLog.findMany({
    where: { organisationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { firstName: true, lastName: true } } },
  });

  return (
    <div>
      <PageHeader title="Audit" subtitle="Immutable record of every operation (last 50)" />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-semibold">Entity Type</th>
              <th className="px-4 py-3 font-semibold">Entity ID</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">No audit events yet.</td></tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-text-primary">{e.entityType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{e.entityId}</td>
                  <td className="px-4 py-3"><ActionBadge action={e.action} /></td>
                  <td className="px-4 py-3 text-text-secondary">{e.actor ? `${e.actor.firstName} ${e.actor.lastName}` : "System"}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(e.createdAt).toLocaleString("en-GB")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
