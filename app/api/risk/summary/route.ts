// GET /api/risk/summary?organisationId=...
// Returns active-document counts by riskLevel.

import { getOrgRiskSummary } from "@/services/riskService";
import { badRequest, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const summary = await getOrgRiskSummary(organisationId);
    return jsonOk({ organisationId, riskSummary: summary });
  } catch (error) {
    return serverError(error);
  }
}
