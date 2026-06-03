// Decision service — deterministic business logic only.
// No LLM calls, no API routes, no UI.
//
// HumanDecision records are append-only: this service creates them but never
// updates or deletes them. AIAnalysis has no isActive field (analyses are
// immutable), so no isActive filter applies to analysis reads here.

import { prisma } from "../lib/prisma";
import { AuditAction, DecisionOutcome, DocumentStatus } from "@prisma/client";

/**
 * All human decisions for an organisation, each with its source AIAnalysis and
 * the person who made the decision. Newest first.
 */
export async function getDecisionsByOrg(organisationId: string) {
  return prisma.humanDecision.findMany({
    where: { organisationId },
    include: {
      analysis: { include: { document: { select: { id: true, title: true } } } },
      decidedBy: true,
    },
    orderBy: { decidedAt: "desc" },
  });
}

/**
 * AIAnalysis records awaiting a human decision — i.e. with no linked
 * HumanDecision. This is the human-approval queue: nothing is acted upon
 * until one of these receives a decision.
 */
export async function getPendingAnalyses(organisationId: string) {
  return prisma.aIAnalysis.findMany({
    where: {
      organisationId,
      humanDecisions: { none: {} },
    },
    include: { document: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateDecisionInput {
  organisationId: string;
  analysisId: string;
  decidedById?: string | null;
  outcome: DecisionOutcome;
  notes?: string | null;
  /** Defaults to now if omitted. */
  decidedAt?: Date;
}

/** Maps a decision outcome to the most descriptive AuditAction. */
function outcomeToAuditAction(outcome: DecisionOutcome): AuditAction {
  switch (outcome) {
    case DecisionOutcome.ACCEPTED:
      return AuditAction.APPROVED;
    case DecisionOutcome.REJECTED:
      return AuditAction.REJECTED;
    default:
      // NEGOTIATED, ESCALATED, DEFERRED
      return AuditAction.REVIEWED;
  }
}

/**
 * Maps a decision outcome to the resolved document status, or null when the
 * outcome does not resolve the document (NEGOTIATED / ESCALATED / DEFERRED keep
 * it UNDER_REVIEW — they are not final).
 */
function outcomeToResolvedStatus(outcome: DecisionOutcome): DocumentStatus | null {
  switch (outcome) {
    case DecisionOutcome.ACCEPTED:
      return DocumentStatus.APPROVED;
    case DecisionOutcome.REJECTED:
      return DocumentStatus.REJECTED;
    default:
      return null;
  }
}

/**
 * Creates an append-only HumanDecision and records an AuditLog entry in the
 * same transaction. Validates that the referenced AIAnalysis exists and
 * belongs to the same organisation.
 */
export async function createDecision(data: CreateDecisionInput) {
  const decidedAt = data.decidedAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.findFirst({
      where: { id: data.analysisId, organisationId: data.organisationId },
      select: { id: true, documentId: true },
    });

    if (!analysis) {
      throw new Error(
        `AIAnalysis ${data.analysisId} not found in organisation ${data.organisationId}`,
      );
    }

    const decision = await tx.humanDecision.create({
      data: {
        organisationId: data.organisationId,
        analysisId: data.analysisId,
        decidedById: data.decidedById ?? null,
        outcome: data.outcome,
        notes: data.notes ?? null,
        decidedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        organisationId: data.organisationId,
        actorId: data.decidedById ?? null,
        entityType: "HumanDecision",
        entityId: decision.id,
        action: outcomeToAuditAction(data.outcome),
        metadata: { outcome: data.outcome, analysisId: data.analysisId },
        newValue: { outcome: data.outcome },
      },
    });

    // Advance the linked document's workflow when the outcome is final
    // (ACCEPTED → APPROVED, REJECTED → REJECTED). Recorded as a separate audit
    // entry so the trail shows both the decision and the resulting state change.
    const resolvedStatus = outcomeToResolvedStatus(data.outcome);
    if (resolvedStatus && analysis.documentId) {
      const document = await tx.document.findUnique({
        where: { id: analysis.documentId },
        select: { status: true },
      });

      if (document && document.status !== resolvedStatus) {
        await tx.document.update({
          where: { id: analysis.documentId },
          data: { status: resolvedStatus },
        });

        await tx.auditLog.create({
          data: {
            organisationId: data.organisationId,
            actorId: data.decidedById ?? null,
            entityType: "Document",
            entityId: analysis.documentId,
            action: AuditAction.UPDATED,
            metadata: { reason: "human-decision", outcome: data.outcome, decisionId: decision.id },
            oldValue: { status: document.status },
            newValue: { status: resolvedStatus },
          },
        });
      }
    }

    return decision;
  });
}
