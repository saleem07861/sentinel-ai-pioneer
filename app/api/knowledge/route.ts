// GET  /api/knowledge?organisationId=...&moduleId=...&tags=a,b,c
//   - with tags: searchKnowledge (match ANY tag); otherwise getKnowledgeEntries
// POST /api/knowledge — create a knowledge entry (writes an AuditLog entry)

import { createKnowledgeEntry, getKnowledgeEntries, searchKnowledge } from "@/services/knowledgeService";
import { badRequest, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const moduleId = url.searchParams.get("moduleId");
    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam
      ? tagsParam.split(",").map((t) => t.trim()).filter((t) => t !== "")
      : [];

    const entries = tags.length
      ? await searchKnowledge(organisationId, tags)
      : await getKnowledgeEntries(organisationId, moduleId ?? undefined);

    return jsonOk({ entries, count: entries.length });
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

    const { organisationId, moduleId, title, summary, sourceDecisionId, tags, actorId } =
      (body ?? {}) as Record<string, unknown>;

    if (!organisationId || typeof organisationId !== "string") return badRequest("organisationId is required");
    if (!title || typeof title !== "string") return badRequest("title is required");
    if (!summary || typeof summary !== "string") return badRequest("summary is required");
    if (tags != null && !Array.isArray(tags)) return badRequest("tags must be an array of strings");

    const entry = await createKnowledgeEntry({
      organisationId,
      moduleId: typeof moduleId === "string" ? moduleId : null,
      title,
      summary,
      sourceDecisionId: typeof sourceDecisionId === "string" ? sourceDecisionId : null,
      tags: Array.isArray(tags) ? (tags as unknown[]).map((t) => String(t)) : [],
      actorId: typeof actorId === "string" ? actorId : null,
    });

    return jsonOk(entry, 201);
  } catch (error) {
    return serverError(error);
  }
}
