// POST /api/knowledge-base/match
// Match a clause against the knowledge base to see if it's substantially
// similar to any approved clause. Used during clause extraction and on-demand
// from the UI.

import { matchAgainstKnowledgeBase } from "@/services/knowledgeBaseClauseService";
import { badRequest, jsonOk, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const { organisationId, title, content, category } = (body ?? {}) as Record<
      string,
      unknown
    >;

    if (!organisationId || typeof organisationId !== "string")
      return badRequest("organisationId is required");
    if (!title || typeof title !== "string")
      return badRequest("title is required");
    if (!content || typeof content !== "string")
      return badRequest("content is required");
    if (!category || typeof category !== "string")
      return badRequest("category is required");

    const result = await matchAgainstKnowledgeBase(
      { title, content, category },
      organisationId,
    );

    return jsonOk(result);
  } catch (error) {
    return serverError(error);
  }
}
