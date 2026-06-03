// Knowledge — institutional memory with two tabs:
//   1. Knowledge Entries — best practices and decision patterns
//   2. Approved Clauses — standard clause corpus for auto-matching
//
// Entries are pre-fetched server-side so they appear immediately.

import { prisma } from "@/lib/prisma";
import { getDefaultOrganisation } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { KnowledgeTabs } from "@/components/KnowledgeTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const org = await getDefaultOrganisation();
  if (!org) return <p className="text-text-secondary">No organisation found.</p>;

  const entries = await prisma.knowledgeEntry.findMany({
    where: { organisationId: org.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, summary: true, tags: true, sourceDecisionId: true },
  });

  return (
    <div>
      <PageHeader
        title="Knowledge"
        subtitle="Best practices, decision patterns, and approved clauses for future reference"
      />
      <KnowledgeTabs organisationId={org.id} initialEntries={entries} />
    </div>
  );
}
