// GET  /api/decisions?organisationId=...   — list decisions with analysis summary + decidedBy name
// POST /api/decisions                       — record a human decision (append-only)

import { DecisionOutcome } from "@prisma/client";
import { createDecision, getDecisionsByOrg } from "@/services/decisionService";
import { badRequest, isEnumValue, isNotFoundError, jsonOk, notFound, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const decisions = await getDecisionsByOrg(organisationId);

    const result = decisions.map((d) => ({
      id: d.id,
      outcome: d.outcome,
      notes: d.notes,
      decidedAt: d.decidedAt,
      decidedBy: d.decidedBy
        ? { id: d.decidedBy.id, name: `${d.decidedBy.firstName} ${d.decidedBy.lastName}` }
        : null,
      analysis: {
        id: d.analysis.id,
        provider: d.analysis.provider,
        riskLevel: d.analysis.riskLevel,
        confidence: d.analysis.confidence,
        runId: d.analysis.runId,
      },
    }));

    return jsonOk({ decisions: result, count: result.length });
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

    const { analysisId, decidedById, outcome, notes, organisationId } = (body ?? {}) as {
      analysisId?: unknown;
      decidedById?: unknown;
      outcome?: unknown;
      notes?: unknown;
      organisationId?: unknown;
    };

    if (!organisationId || typeof organisationId !== "string") return badRequest("organisationId is required");
    if (!analysisId || typeof analysisId !== "string") return badRequest("analysisId is required");
    if (!decidedById || typeof decidedById !== "string") return badRequest("decidedById is required");
    if (!outcome) return badRequest("outcome is required");
    if (!isEnumValue(DecisionOutcome, outcome)) return badRequest(`Invalid outcome: ${String(outcome)}`);
    if (notes != null && typeof notes !== "string") return badRequest("notes must be a string");

    const decision = await createDecision({
      organisationId,
      analysisId,
      decidedById,
      outcome,
      notes: (notes as string | undefined) ?? null,
    });

    return jsonOk(decision, 201);
  } catch (error) {
    if (isNotFoundError(error)) return notFound("Referenced AIAnalysis not found for this organisation");
    return serverError(error);
  }
}
