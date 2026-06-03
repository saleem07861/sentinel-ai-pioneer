// GET /api/knowledge-base/templates?organisationId=...
// Returns unique source documents (templates) with clause counts.
//
// DELETE /api/knowledge-base/templates?organisationId=...&sourceDocument=...
// Deletes all clauses from a specific source document (template).

import { prisma } from "@/lib/prisma";
import { badRequest, jsonOk, serverError, requireParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const templates = await prisma.knowledgeBaseClause.groupBy({
      by: ["sourceDocument"],
      where: {
        organisationId,
        isActive: true,
        sourceDocument: { not: null },
      },
      _count: { _all: true },
      orderBy: { sourceDocument: "asc" },
    });

    return jsonOk({
      templates: templates.map((t) => ({
        name: t.sourceDocument,
        clauseCount: t._count._all,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    const sourceDocument = url.searchParams.get("sourceDocument");
    if (!organisationId) return badRequest("organisationId is required");
    if (!sourceDocument) return badRequest("sourceDocument is required");

    const result = await prisma.knowledgeBaseClause.updateMany({
      where: { organisationId, sourceDocument },
      data: { isActive: false },
    });

    return jsonOk({ deleted: result.count, sourceDocument });
  } catch (error) {
    return serverError(error);
  }
}
