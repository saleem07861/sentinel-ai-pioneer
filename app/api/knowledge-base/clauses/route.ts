// GET  /api/knowledge-base/clauses?organisationId=...&category=...
// POST /api/knowledge-base/clauses — add a single clause manually

import {
  addKBClause,
  getKBClauses,
  getKBCategories,
  getKBClauseCount,
} from "@/services/knowledgeBaseClauseService";
import { badRequest, jsonOk, serverError, requireParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const category = url.searchParams.get("category");

    const [clauses, categories, count] = await Promise.all([
      getKBClauses(organisationId, category ?? null),
      getKBCategories(organisationId),
      getKBClauseCount(organisationId, category ?? null),
    ]);

    return jsonOk({ clauses, categories, count });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const {
      organisationId,
      moduleId,
      title,
      content,
      category,
      sourceDocument,
      tags,
      actorId,
    } = (body ?? {}) as Record<string, unknown>;

    if (!organisationId || typeof organisationId !== "string")
      return badRequest("organisationId is required");
    if (!title || typeof title !== "string")
      return badRequest("title is required");
    if (!content || typeof content !== "string")
      return badRequest("content is required");
    if (!category || typeof category !== "string")
      return badRequest("category is required");

    const result = await addKBClause({
      organisationId,
      moduleId: typeof moduleId === "string" ? moduleId : null,
      title,
      content,
      category,
      sourceDocument:
        typeof sourceDocument === "string" ? sourceDocument : null,
      tags: Array.isArray(tags) ? (tags as unknown[]).map((t) => String(t)) : [],
      actorId: typeof actorId === "string" ? actorId : null,
    });

    return jsonOk(result, result.created ? 201 : 200);
  } catch (error) {
    return serverError(error);
  }
}
