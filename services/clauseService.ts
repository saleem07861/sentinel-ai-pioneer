// Clause service — deterministic business logic only.
// No LLM calls, no API routes, no UI.
//
// Note: the Clause model has no isActive field (clauses live and die with
// their parent document, which IS soft-deletable), so the isActive filter
// does not apply to clause reads.

import { prisma } from "../lib/prisma";
import { AuditAction, ClauseStatus, DocumentStatus, ReviewStatus, RiskLevel } from "@prisma/client";

/** Documents in these statuses are still in the review pipeline. */
const UNRESOLVED: DocumentStatus[] = [
  DocumentStatus.UPLOADED,
  DocumentStatus.UNDER_REVIEW,
  DocumentStatus.REVIEWED,
];

/**
 * All clauses for a document, in document order.
 */
export async function getClausesByDocument(documentId: string) {
  return prisma.clause.findMany({
    where: { documentId },
    orderBy: { orderIndex: "asc" },
  });
}

/**
 * Clauses across an organisation filtered by a single ClauseStatus.
 */
export async function getClausesByStatus(
  organisationId: string,
  status: ClauseStatus,
) {
  return prisma.clause.findMany({
    where: { organisationId, status },
    orderBy: [{ documentId: "asc" }, { orderIndex: "asc" }],
  });
}

/**
 * Material attention list: clauses that are FLAGGED or a DEVIATION AND carry a
 * HIGH or CRITICAL risk level, only from documents still in the review pipeline
 * (UPLOADED, UNDER_REVIEW, or REVIEWED).
 */
export async function getFlaggedClauses(organisationId: string) {
  return prisma.clause.findMany({
    where: {
      organisationId,
      status: { in: [ClauseStatus.FLAGGED, ClauseStatus.DEVIATION] },
      riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
      document: { status: { in: UNRESOLVED } },
    },
    orderBy: [{ riskLevel: "desc" }, { documentId: "asc" }, { orderIndex: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Per-clause human review
// ---------------------------------------------------------------------------

export interface UpdateClauseInput {
  clauseId: string;
  /** New content if the clause was edited (null = keep original). */
  editedContent?: string | null;
  /** New review status. */
  reviewStatus: ReviewStatus;
  /** Person making the edit. */
  actorId?: string | null;
}

/**
 * Update a single clause's review status and optionally its edited content.
 * Records an audit log entry. After the update, checks whether ALL clauses
 * on the document are ACCEPTED — if so, rebuilds the approved document and
 * creates a new version.
 */
export async function updateClauseReview(input: UpdateClauseInput) {
  return prisma.$transaction(async (tx) => {
    const clause = await tx.clause.findFirst({
      where: { id: input.clauseId },
      select: { id: true, organisationId: true, documentId: true, title: true, reviewStatus: true },
    });
    if (!clause) {
      throw new Error(`Clause ${input.clauseId} not found`);
    }

    const updated = await tx.clause.update({
      where: { id: input.clauseId },
      data: {
        reviewStatus: input.reviewStatus,
        editedContent: input.editedContent ?? undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        organisationId: clause.organisationId,
        actorId: input.actorId ?? null,
        entityType: "Clause",
        entityId: clause.id,
        action: AuditAction.REVIEWED,
        metadata: {
          title: clause.title,
          previousReviewStatus: clause.reviewStatus,
          newReviewStatus: input.reviewStatus,
          wasEdited: input.editedContent != null,
        },
        oldValue: { reviewStatus: clause.reviewStatus },
        newValue: { reviewStatus: input.reviewStatus },
      },
    });

    // Check if all clauses on the document are now ACCEPTED
    const allClauses = await tx.clause.findMany({
      where: { documentId: clause.documentId },
      select: { reviewStatus: true },
    });

    const allAccepted = allClauses.length > 0 && allClauses.every((c) => c.reviewStatus === ReviewStatus.ACCEPTED);

    if (allAccepted) {
      // Build the approved content from accepted/edited clause texts
      const clausesForBuild = await tx.clause.findMany({
        where: { documentId: clause.documentId },
        orderBy: { orderIndex: "asc" },
        select: { title: true, content: true, editedContent: true },
      });

      const approvedContent = clausesForBuild
        .map((c) => `${c.title.toUpperCase()}\n\n${c.editedContent ?? c.content}`)
        .join("\n\n---\n\n");

      // Store approvedContent but keep status as UNDER_REVIEW — waiting for explicit human decision
      await tx.document.update({
        where: { id: clause.documentId },
        data: { approvedContent },
      });
    }

    return { clause: updated, allAccepted };
  });
}

/**
 * Check if all clauses on a document have been accepted.
 */
export async function areAllClausesAccepted(documentId: string): Promise<boolean> {
  const clauses = await prisma.clause.findMany({
    where: { documentId },
    select: { reviewStatus: true },
  });
  return clauses.length > 0 && clauses.every((c) => c.reviewStatus === ReviewStatus.ACCEPTED);
}

/**
 * Get review progress for a document (accepted / total).
 */
export async function getClauseReviewProgress(documentId: string) {
  const clauses = await prisma.clause.findMany({
    where: { documentId },
    select: { reviewStatus: true, status: true },
  });
  // Only non-STANDARD clauses require manual review
  const requiresReview = clauses.filter((c) => c.status !== "STANDARD");
  const accepted = requiresReview.filter((c) => c.reviewStatus === ReviewStatus.ACCEPTED).length;
  // If all clauses are STANDARD, ready for decision immediately
  const allStandard = clauses.length > 0 && requiresReview.length === 0;
  return {
    accepted,
    total: requiresReview.length,
    allAccepted: allStandard || (requiresReview.length > 0 && accepted === requiresReview.length),
  };
}
