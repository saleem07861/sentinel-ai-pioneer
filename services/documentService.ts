// Document service — deterministic business logic only.
// No LLM calls, no API routes, no UI.
//
// Rules enforced here:
//   - Reads of Document / Template / Person filter isActive: true.
//   - State-changing writes record an AuditLog entry (atomically, in a tx).

import { prisma } from "../lib/prisma";
import {
  AuditAction,
  ClauseStatus,
  DocumentStatus,
  RiskLevel,
} from "@prisma/client";

/**
 * All active documents for an organisation, newest first.
 */
export async function getDocumentsByOrg(organisationId: string) {
  return prisma.document.findMany({
    where: { organisationId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * A single active document, including its clauses (ordered), the template it
 * was compared against, and the person who uploaded it.
 *
 * Note: `template` and `uploadedBy` are to-one relations — Prisma does not
 * support a `where` filter on to-one includes, so their isActive state cannot
 * be filtered at the query level (it would also hide a legitimately-linked but
 * deactivated record). The top-level document is filtered isActive: true.
 */
export async function getDocumentById(id: string) {
  return prisma.document.findFirst({
    where: { id, isActive: true },
    include: {
      clauses: { orderBy: { orderIndex: "asc" } },
      template: true,
      uploadedBy: true,
      previousVersion: {
        select: { id: true, title: true, version: true },
      },
      nextVersion: {
        select: { id: true, title: true, version: true },
      },
    },
  });
}

/**
 * Fetch a document with its previous version for side-by-side comparison.
 * Returns null if the document doesn't exist or has no previous version.
 */
export async function getDocumentWithPreviousVersion(id: string) {
  const doc = await prisma.document.findFirst({
    where: { id, isActive: true },
    include: {
      previousVersion: {
        include: { clauses: { orderBy: { orderIndex: "asc" } } },
      },
      clauses: { orderBy: { orderIndex: "asc" } },
    },
  });
  return doc;
}

export interface DocumentRiskSummary {
  documentId: string;
  totalClauses: number;
  byRiskLevel: Record<RiskLevel | "UNSET", number>;
  byStatus: Record<ClauseStatus, number>;
}

/**
 * Clause counts for a document, broken down by riskLevel and ClauseStatus.
 * Clauses have no isActive field, so all clauses for the document are counted.
 */
export async function getDocumentRiskSummary(
  documentId: string,
): Promise<DocumentRiskSummary> {
  const clauses = await prisma.clause.findMany({
    where: { documentId },
    select: { riskLevel: true, status: true },
  });

  const byRiskLevel = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
    UNSET: 0,
  } as Record<RiskLevel | "UNSET", number>;

  const byStatus = {
    STANDARD: 0,
    DEVIATION: 0,
    MISSING: 0,
    ACCEPTABLE: 0,
    FLAGGED: 0,
  } as Record<ClauseStatus, number>;

  for (const c of clauses) {
    byRiskLevel[c.riskLevel ?? "UNSET"] += 1;
    byStatus[c.status] += 1;
  }

  return {
    documentId,
    totalClauses: clauses.length,
    byRiskLevel,
    byStatus,
  };
}

/**
 * Updates a document's status and records an AuditLog entry in the same
 * transaction. Throws if the document does not exist or is inactive.
 */
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  actorId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.document.findFirst({
      where: { id: documentId, isActive: true },
      select: { id: true, organisationId: true, status: true },
    });

    if (!existing) {
      throw new Error(`Document ${documentId} not found or is inactive`);
    }

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { status },
    });

    await tx.auditLog.create({
      data: {
        organisationId: existing.organisationId,
        actorId: actorId ?? null,
        entityType: "Document",
        entityId: documentId,
        action: AuditAction.UPDATED,
        metadata: { field: "status" },
        oldValue: { status: existing.status },
        newValue: { status },
      },
    });

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Metadata extraction — regex-based company name + contract type detection
// ---------------------------------------------------------------------------

export interface DocumentMetadata {
  parties?: string[];
  contractType?: string;
  effectiveDate?: string;
  extractedAt?: string;
}

/**
 * Extract key metadata from contract text using simple regex patterns.
 * This is a lightweight, offline extraction — not AI-powered.
 * Returns parties, contract type, and effective date when found.
 */
export function extractMetadata(text: string): DocumentMetadata {
  const metadata: DocumentMetadata = {};

  // Extract parties from "between X and Y" pattern
  const betweenMatch = text.match(
    /between\s+([A-Z][A-Z\s,.'&()-]+?)\s+(?:\([^)]*\)\s*)?and\s+([A-Z][A-Z\s,.'&()-]+?)(?:\s*\(|,|\.|\n)/i,
  );
  if (betweenMatch) {
    metadata.parties = [betweenMatch[1].trim(), betweenMatch[2].trim()];
  }

  // Extract contract type from first heading or title-like line
  const typeMatch = text.match(
    /^([A-Z][A-Z\s]+(?:AGREEMENT|CONTRACT|NDA|ORDER\s*FORM|SERVICE\s*AGREEMENT|LICENCE|LICENSE|STATEMENT\s*OF\s*WORK|ADDENDUM|AMENDMENT))/m,
  );
  if (typeMatch) {
    metadata.contractType = typeMatch[1].trim();
  }

  // Extract date patterns (e.g., "1 January 2024", "January 1, 2024", "2024-01-01")
  const dateMatch = text.match(
    /(?:dated|as of|effective|executed)\s+(?:the\s+)?(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  if (dateMatch) {
    metadata.effectiveDate = dateMatch[1].trim();
  }

  metadata.extractedAt = new Date().toISOString();

  return metadata;
}
