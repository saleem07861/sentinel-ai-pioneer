// GET /api/decisions/pending?organisationId=...
// Returns AIAnalysis records that have no linked HumanDecision (the approval queue).

import { getPendingAnalyses } from "@/services/decisionService";
import { badRequest, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const pending = await getPendingAnalyses(organisationId);
    return jsonOk({ pendingAnalyses: pending, count: pending.length });
  } catch (error) {
    return serverError(error);
  }
}
