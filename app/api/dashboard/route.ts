// GET /api/dashboard?organisationId=...
// One consolidated snapshot for the org (see services/dashboardService).

import { getDashboardData } from "@/services/dashboardService";
import { badRequest, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const data = await getDashboardData(organisationId);
    return jsonOk(data);
  } catch (error) {
    return serverError(error);
  }
}
