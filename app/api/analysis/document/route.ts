// POST /api/analysis/document
// Body: { documentId: string, actorId?: string }
// Looks up the org's defaultAIProvider, runs the analysis, returns the saved
// AIAnalysis. Server-side only — the AI client is never reached from the browser.

import { prisma } from "@/lib/prisma";
import { runDocumentAnalysis } from "@/agents/analysisAgent";
import { badRequest, jsonOk, notFound, serverError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const { documentId, actorId } = (body ?? {}) as { documentId?: unknown; actorId?: unknown };
    if (!documentId || typeof documentId !== "string") {
      return badRequest("documentId is required");
    }
    if (actorId != null && typeof actorId !== "string") {
      return badRequest("actorId must be a string");
    }

    // Resolve the org's configured provider (wires per-org provider selection).
    const document = await prisma.document.findFirst({
      where: { id: documentId, isActive: true },
      select: { organisationId: true },
    });
    if (!document) return notFound(`Document ${documentId} not found`);

    const settings = await prisma.organisationSettings.findUnique({
      where: { organisationId: document.organisationId },
      select: { defaultAIProvider: true },
    });

    const analysis = await runDocumentAnalysis(
      documentId,
      actorId ?? null,
      settings?.defaultAIProvider ?? null,
    );

    return jsonOk(analysis, 201);
  } catch (error) {
    return serverError(error);
  }
}
