// GET /api/clauses?documentId=...
// Returns the document's clauses in document order.

import { getClausesByDocument } from "@/services/clauseService";
import { badRequest, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = requireParam(url, "documentId");
    if (!documentId) return badRequest("documentId is required");

    const clauses = await getClausesByDocument(documentId);
    return jsonOk({ clauses, count: clauses.length });
  } catch (error) {
    return serverError(error);
  }
}
