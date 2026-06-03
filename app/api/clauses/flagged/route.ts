// GET /api/clauses/flagged?organisationId=...
// Returns FLAGGED / DEVIATION clauses at HIGH or CRITICAL risk across the org.

import { getFlaggedClauses } from "@/services/clauseService";
import { badRequest, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const clauses = await getFlaggedClauses(organisationId);
    return jsonOk({ clauses, count: clauses.length });
  } catch (error) {
    return serverError(error);
  }
}
