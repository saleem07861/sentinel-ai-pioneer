// Analysis agent — orchestrates an AI analysis run and persists it under the
// human-approval model. SERVER-SIDE ONLY.
//
// It never acts on the AI output: it writes an immutable AIAnalysis record and
// an AuditLog entry, and moves the document to UNDER_REVIEW. A human must still
// create a HumanDecision (see decisionService) before anything is acted upon.

import { prisma } from "../lib/prisma";
import { AIProvider, AuditAction, DocumentStatus, RiskLevel } from "@prisma/client";
// AIProvider is used both to type the optional per-org provider override and
// to map the client's provider string back to the enum when persisting.
import { getAIClient, configureAIClientKeys } from "./aiClientFactory";
import { getDocumentById } from "../services/documentService";
import { getClausesByDocument } from "../services/clauseService";
import { AIAnalysisResult } from "./types";

const VALID_PROVIDERS = Object.values(AIProvider) as string[];

/** Map a client's provider string to the AIProvider enum, defaulting to MOCK. */
function toAIProvider(provider: string): AIProvider {
  const upper = provider.toUpperCase();
  return VALID_PROVIDERS.includes(upper) ? (upper as AIProvider) : AIProvider.MOCK;
}

/** Assemble the full document text from its ordered clauses. */
function buildDocumentContent(
  clauses: { orderIndex: number; title: string; content: string }[],
): string {
  return clauses
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((c) => `${c.orderIndex}. ${c.title}\n${c.content}`)
    .join("\n\n");
}

/**
 * Runs an AI analysis over a full document, persists the result as an immutable
 * AIAnalysis row, moves the document to UNDER_REVIEW, and writes an AI_ANALYSED
 * audit entry — all atomically. Returns the created AIAnalysis.
 */
export async function runDocumentAnalysis(
  documentId: string,
  actorId?: string | null,
  provider?: AIProvider | null,
) {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error(`Document ${documentId} not found or is inactive`);
  }

  const clauses = await getClausesByDocument(documentId);
  const content = buildDocumentContent(clauses);

  // Inject org-level API keys
  const settings = await prisma.organisationSettings.findUnique({
    where: { organisationId: document.organisationId },
    select: { deepseekApiKey: true, openaiApiKey: true, localAiUrl: true },
  });
  configureAIClientKeys({
    deepseekApiKey: settings?.deepseekApiKey,
    openaiApiKey: settings?.openaiApiKey,
    localAiUrl: settings?.localAiUrl,
  });

  const client = getAIClient(provider);
  const result: AIAnalysisResult = await client.analyse({
    documentId,
    content,
    templateClause: document.template?.content,
    context: document.title,
  });

  return persistAnalysis({
    organisationId: document.organisationId,
    documentId,
    clauseId: null,
    result,
    actorId: actorId ?? null,
    moveToUnderReview: true,
  });
}

/**
 * INFERRED (beyond the cut-off spec, justified by the clauseService import and
 * the clauseId/templateClause fields on AIAnalysisRequest): runs an AI analysis
 * over a single clause and persists it. Does not change document status.
 */
export async function runClauseAnalysis(
  clauseId: string,
  actorId?: string | null,
  provider?: AIProvider | null,
) {
  const clause = await prisma.clause.findFirst({
    where: { id: clauseId },
    select: {
      id: true,
      organisationId: true,
      documentId: true,
      title: true,
      content: true,
      templateClause: true,
    },
  });
  if (!clause) {
    throw new Error(`Clause ${clauseId} not found`);
  }

  const client = getAIClient(provider);
  const result: AIAnalysisResult = await client.analyse({
    documentId: clause.documentId,
    clauseId: clause.id,
    content: clause.content,
    templateClause: clause.templateClause ?? undefined,
    context: clause.title,
  });

  return persistAnalysis({
    organisationId: clause.organisationId,
    documentId: clause.documentId,
    clauseId: clause.id,
    result,
    actorId: actorId ?? null,
    moveToUnderReview: false,
  });
}

interface PersistArgs {
  organisationId: string;
  documentId: string | null;
  clauseId: string | null;
  result: AIAnalysisResult;
  actorId: string | null;
  moveToUnderReview: boolean;
}

/** Atomic: create AIAnalysis (+ optional status change) + AI_ANALYSED audit. */
async function persistAnalysis(args: PersistArgs) {
  const { organisationId, documentId, clauseId, result, actorId, moveToUnderReview } = args;

  return prisma.$transaction(async (tx) => {
    const analysis = await tx.aIAnalysis.create({
      data: {
        organisationId,
        documentId: documentId ?? undefined,
        clauseId: clauseId ?? undefined,
        provider: toAIProvider(result.provider),
        promptVersion: result.promptVersion,
        runId: result.runId,
        confidence: result.confidence,
        findings: result.findings,
        suggestedResponse: result.suggestedResponse ?? null,
        riskLevel: result.riskLevel as RiskLevel,
        tokensUsed: result.tokensUsed ?? null,
        durationMs: result.durationMs ?? null,
      },
    });

    if (moveToUnderReview && documentId) {
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.UNDER_REVIEW,
          riskLevel: result.riskLevel as RiskLevel,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organisationId,
        actorId: actorId ?? null,
        entityType: clauseId ? "Clause" : "Document",
        entityId: clauseId ?? documentId ?? analysis.id,
        action: AuditAction.AI_ANALYSED,
        metadata: {
          analysisId: analysis.id,
          provider: analysis.provider,
          runId: result.runId,
          riskLevel: result.riskLevel,
          movedToUnderReview: moveToUnderReview && Boolean(documentId),
        },
      },
    });

    return analysis;
  });
}
