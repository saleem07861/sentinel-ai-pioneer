// POST /api/analysis/clause
// Body: { clauseId: string, actorId?: string }
// Looks up the org's defaultAIProvider, runs a clause-level analysis, returns
// the saved AIAnalysis. Server-side only.

import { prisma } from "@/lib/prisma";
import { runClauseAnalysis } from "@/agents/analysisAgent";
import { badRequest, jsonOk, notFound, serverError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const { clauseId, actorId } = (body ?? {}) as { clauseId?: unknown; actorId?: unknown };
    if (!clauseId || typeof clauseId !== "string") {
      return badRequest("clauseId is required");
    }
    if (actorId != null && typeof actorId !== "string") {
      return badRequest("actorId must be a string");
    }

    const clause = await prisma.clause.findFirst({
      where: { id: clauseId },
      select: { organisationId: true },
    });
    if (!clause) return notFound(`Clause ${clauseId} not found`);

    const settings = await prisma.organisationSettings.findUnique({
      where: { organisationId: clause.organisationId },
      select: { defaultAIProvider: true },
    });

    const analysis = await runClauseAnalysis(
      clauseId,
      actorId ?? null,
      settings?.defaultAIProvider ?? null,
    );

    return jsonOk(analysis, 201);
  } catch (error) {
    return serverError(error);
  }
}
