// GET /api/knowledge-base/categories?organisationId=...
// Returns distinct clause categories in the knowledge base.

import { getKBCategories } from "@/services/knowledgeBaseClauseService";
import { badRequest, jsonOk, serverError, requireParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const categories = await getKBCategories(organisationId);
    return jsonOk({ categories });
  } catch (error) {
    return serverError(error);
  }
}
