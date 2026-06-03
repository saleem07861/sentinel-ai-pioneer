// PUT /api/clauses/[id] — update clause review status and optionally edit content.
// GET  /api/clauses/[id] — get a single clause.

import { ReviewStatus } from "@prisma/client";
import { updateClauseReview } from "@/services/clauseService";
import { prisma } from "@/lib/prisma";
import { badRequest, isEnumValue, isNotFoundError, jsonOk, notFound, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const clause = await prisma.clause.findUnique({ where: { id: params.id } });
    if (!clause) return notFound(`Clause ${params.id} not found`);
    return jsonOk(clause);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const { reviewStatus, editedContent, actorId } = (body ?? {}) as {
      reviewStatus?: unknown;
      editedContent?: unknown;
      actorId?: unknown;
    };

    if (!reviewStatus) return badRequest("reviewStatus is required");
    if (!isEnumValue(ReviewStatus, reviewStatus)) return badRequest(`Invalid reviewStatus: ${String(reviewStatus)}`);
    if (editedContent != null && typeof editedContent !== "string") return badRequest("editedContent must be a string");

    const result = await updateClauseReview({
      clauseId: params.id,
      reviewStatus,
      editedContent: (editedContent as string | undefined) ?? null,
      actorId: typeof actorId === "string" ? actorId : null,
    });

    return jsonOk(result);
  } catch (error) {
    if (isNotFoundError(error)) return notFound(`Clause ${params.id} not found`);
    return serverError(error);
  }
}
