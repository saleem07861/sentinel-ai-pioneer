// Risk service — deterministic scoring and aggregation only.
// No LLM calls, no API routes, no UI.

import { prisma } from "../lib/prisma";
import { DocumentStatus, ReviewStatus, RiskLevel } from "@prisma/client";

/** Risk weight per clause risk level, used by getDocumentRiskScore. */
const RISK_WEIGHTS: Record<RiskLevel, number> = {
  CRITICAL: 40,
  HIGH: 20,
  MEDIUM: 10,
  LOW: 0,
};

const MAX_SCORE = 100;

/** Documents in these statuses are still in the review pipeline. */
const UNRESOLVED: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.UNDER_REVIEW,
  DocumentStatus.REVIEWED,
];

export type OrgRiskSummary = Record<RiskLevel | "UNSET", number>;

/**
 * Count of active, unresolved documents in an organisation by riskLevel.
 * Documents with no riskLevel set are counted under "UNSET".
 * Resolved (APPROVED / REJECTED / ARCHIVED) documents are excluded.
 */
export async function getOrgRiskSummary(
  organisationId: string,
): Promise<OrgRiskSummary> {
  const grouped = await prisma.document.groupBy({
    by: ["riskLevel"],
    where: { organisationId, isActive: true, status: { in: UNRESOLVED } },
    _count: { _all: true },
  });

  const summary: OrgRiskSummary = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
    UNSET: 0,
  };

  for (const row of grouped) {
    summary[row.riskLevel ?? "UNSET"] = row._count._all;
  }

  return summary;
}

/**
 * Deterministic 0–100 risk score for a document, summed from clause weights
 * (CRITICAL=40, HIGH=20, MEDIUM=10, LOW=0) and capped at 100.
 * Reviewed/accepted clauses reduce risk: ACCEPTED=0%, EDITED=50%, FLAGGED=100%, PENDING=100%.
 * Clauses have no isActive field, so all clauses are scored.
 */
export async function getDocumentRiskScore(documentId: string): Promise<{ score: number; originalScore: number }> {
  const clauses = await prisma.clause.findMany({
    where: { documentId },
    select: { riskLevel: true, reviewStatus: true },
  });

  const original = clauses.reduce(
    (sum, c) => sum + (c.riskLevel ? RISK_WEIGHTS[c.riskLevel] : 0),
    0,
  );

  const reviewed = clauses.reduce((sum, c) => {
    const weight = c.riskLevel ? RISK_WEIGHTS[c.riskLevel] : 0;
    if (c.reviewStatus === ReviewStatus.ACCEPTED) return sum; // Fully resolved
    if (c.reviewStatus === ReviewStatus.EDITED) return sum + weight * 0.5; // Addressed
    return sum + weight; // FLAGGED or PENDING — full weight
  }, 0);

  return {
    score: Math.min(reviewed, 100),
    originalScore: Math.min(original, 100),
  };
}

/**
 * Active, unresolved documents whose own riskLevel is HIGH or CRITICAL.
 * Resolved (APPROVED / REJECTED / ARCHIVED) documents are excluded.
 */
export async function getHighRiskDocuments(organisationId: string) {
  return prisma.document.findMany({
    where: {
      organisationId,
      isActive: true,
      riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
      status: { in: UNRESOLVED },
    },
    orderBy: { riskLevel: "desc" },
  });
}
