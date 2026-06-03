// Dashboard service — one consolidated org snapshot from a single parallel
// query set. Shared by the /api/dashboard route and the dashboard page.

import { prisma } from "../lib/prisma";
import { DocumentStatus, RiskLevel } from "@prisma/client";

/** Documents in these statuses are still in the review pipeline. */
const UNRESOLVED: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.UNDER_REVIEW,
  DocumentStatus.REVIEWED,
];

export interface DashboardData {
  organisationId: string;
  totalDocuments: number;
  documentsUnderReview: number;
  highRiskDocuments: number;
  pendingDecisions: number;
  completedDecisions: number;
  knowledgeEntries: number;
  approvedClauses: number;
  riskSummary: Record<RiskLevel | "UNSET", number>;
  recentDocuments: {
    id: string;
    title: string;
    status: string;
    riskLevel: string | null;
    metadata: unknown;
    createdAt: Date;
    uploadedBy: { firstName: string; lastName: string } | null;
  }[];
  recentAuditEvents: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId: string | null;
    createdAt: Date;
  }[];
}

export async function getDashboardData(organisationId: string): Promise<DashboardData> {
  const activeDocs = { organisationId, isActive: true };

  const [
    totalDocuments,
    documentsUnderReview,
    highRiskDocuments,
    pendingDecisions,
    completedDecisions,
    knowledgeEntries,
    approvedClauses,
    riskGroups,
    recentDocuments,
    recentAuditEvents,
  ] = await Promise.all([
    prisma.document.count({ where: activeDocs }),
    prisma.document.count({ where: { ...activeDocs, status: "UNDER_REVIEW" } }),
    prisma.document.count({
      where: { ...activeDocs, riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] }, status: { in: UNRESOLVED } },
    }),
    prisma.aIAnalysis.count({ where: { organisationId, humanDecisions: { none: {} } } }),
    prisma.humanDecision.count({ where: { organisationId } }),
    prisma.knowledgeEntry.count({ where: { organisationId, isActive: true } }),
    prisma.knowledgeBaseClause.count({ where: { organisationId, isActive: true } }),
    prisma.document.groupBy({ by: ["riskLevel"], where: { ...activeDocs, status: { in: UNRESOLVED } }, _count: { _all: true } }),
    prisma.document.findMany({
      where: activeDocs,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        status: true,
        riskLevel: true,
        metadata: true,
        createdAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { organisationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        actorId: true,
        createdAt: true,
      },
    }),
  ]);

  const riskSummary: Record<RiskLevel | "UNSET", number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
    UNSET: 0,
  };
  for (const g of riskGroups) {
    riskSummary[g.riskLevel ?? "UNSET"] = g._count._all;
  }

  return {
    organisationId,
    totalDocuments,
    documentsUnderReview,
    highRiskDocuments,
    pendingDecisions,
    completedDecisions,
    knowledgeEntries,
    approvedClauses,
    riskSummary,
    recentDocuments,
    recentAuditEvents,
  };
}
