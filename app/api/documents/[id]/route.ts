// GET /api/documents/[id]
// Returns an active document with its clauses, template, uploadedBy, and the
// AIAnalysis records (with their HumanDecisions) attached to it.

import { prisma } from "@/lib/prisma";
import { getDocumentById } from "@/services/documentService";
import { jsonOk, notFound, serverError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const document = await getDocumentById(params.id);
    if (!document) return notFound(`Document ${params.id} not found`);

    const aiAnalyses = await prisma.aIAnalysis.findMany({
      where: { documentId: params.id },
      include: {
        humanDecisions: {
          include: { decidedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { decidedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Document-level decisions = decisions across all of the document's analyses.
    const humanDecisions = aiAnalyses.flatMap((a) => a.humanDecisions);

    return jsonOk({ ...document, aiAnalyses, humanDecisions });
  } catch (error) {
    return serverError(error);
  }
}
