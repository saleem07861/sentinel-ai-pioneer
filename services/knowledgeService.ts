// Knowledge service — deterministic business logic only.
// No LLM calls, no API routes, no UI.
//
// KnowledgeEntry has an isActive field, so all reads filter isActive: true.

import { prisma } from "../lib/prisma";
import { AuditAction } from "@prisma/client";

/**
 * Active knowledge entries for an organisation, optionally scoped to a module.
 */
export async function getKnowledgeEntries(
  organisationId: string,
  moduleId?: string | null,
) {
  return prisma.knowledgeEntry.findMany({
    where: {
      organisationId,
      isActive: true,
      ...(moduleId ? { moduleId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Active knowledge entries that match ANY of the supplied tags.
 * An empty tag list returns no entries.
 */
export async function searchKnowledge(
  organisationId: string,
  tags: string[],
) {
  if (tags.length === 0) return [];

  return prisma.knowledgeEntry.findMany({
    where: {
      organisationId,
      isActive: true,
      tags: { hasSome: tags },
    },
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateKnowledgeEntryInput {
  organisationId: string;
  moduleId?: string | null;
  title: string;
  summary: string;
  sourceDecisionId?: string | null;
  tags?: string[];
  /** Optional actor for the audit trail. */
  actorId?: string | null;
}

/**
 * Creates a KnowledgeEntry and records an AuditLog entry in the same
 * transaction.
 */
export async function createKnowledgeEntry(data: CreateKnowledgeEntryInput) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.knowledgeEntry.create({
      data: {
        organisationId: data.organisationId,
        moduleId: data.moduleId ?? null,
        title: data.title,
        summary: data.summary,
        sourceDecisionId: data.sourceDecisionId ?? null,
        tags: data.tags ?? [],
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        organisationId: data.organisationId,
        actorId: data.actorId ?? null,
        entityType: "KnowledgeEntry",
        entityId: entry.id,
        action: AuditAction.CREATED,
        metadata: { title: data.title, tags: data.tags ?? [] },
        newValue: { title: data.title, summary: data.summary },
      },
    });

    return entry;
  });
}
