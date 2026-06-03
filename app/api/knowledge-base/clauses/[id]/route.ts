// DELETE /api/knowledge-base/clauses/[id]
// Soft-deletes a knowledge base clause.

import { removeKBClause } from "@/services/knowledgeBaseClauseService";
import { badRequest, jsonOk, notFound, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    if (!id) return badRequest("clause id is required");

    const url = new URL(request.url);
    const organisationId = url.searchParams.get("organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const actorId = url.searchParams.get("actorId") ?? null;

    try {
      const result = await removeKBClause(id, organisationId, actorId);
      return jsonOk(result);
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return notFound(error.message);
      }
      throw error;
    }
  } catch (error) {
    return serverError(error);
  }
}
