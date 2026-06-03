// GET /api/risk/documents/[id]/score
// Returns the document's 0–100 risk score plus a per-level breakdown.

import { getDocumentById, getDocumentRiskSummary } from "@/services/documentService";
import { getDocumentRiskScore } from "@/services/riskService";
import { jsonOk, notFound, serverError } from "@/lib/http";

// Mirrors riskService weights so the breakdown explains the score.
const WEIGHTS = { CRITICAL: 40, HIGH: 20, MEDIUM: 10, LOW: 0 } as const;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const document = await getDocumentById(params.id);
    if (!document) return notFound(`Document ${params.id} not found`);

    const [riskResult, summary] = await Promise.all([
      getDocumentRiskScore(params.id),
      getDocumentRiskSummary(params.id),
    ]);

    const breakdown = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((level) => {
      const count = summary.byRiskLevel[level];
      return { level, count, weight: WEIGHTS[level], points: count * WEIGHTS[level] };
    });

    return jsonOk({
      documentId: params.id,
      score: riskResult.score,
      originalScore: riskResult.originalScore,
      capped: breakdown.reduce((s, b) => s + b.points, 0) > riskResult.score,
      breakdown,
      totalClauses: summary.totalClauses,
    });
  } catch (error) {
    return serverError(error);
  }
}
