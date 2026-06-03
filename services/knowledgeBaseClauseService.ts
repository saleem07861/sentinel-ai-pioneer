// Knowledge Base Clause Service — deterministic business logic + AI-assisted
// similarity matching against the approved clause corpus.
// No API routes, no UI.

import { prisma } from "../lib/prisma";
import { AuditAction } from "@prisma/client";
import { getAIClient } from "../agents/aiClientFactory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateKBClauseInput {
  organisationId: string;
  moduleId?: string | null;
  title: string;
  content: string;
  category: string;
  sourceDocument?: string | null;
  tags?: string[];
  actorId?: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  clauses: { title: string; category: string; imported: boolean }[];
  error?: string;
}

export interface KBMatchResult {
  matched: boolean;
  matchedClauseId?: string;
  matchedTitle?: string;
  matchedContent?: string;
  confidence: number;
  kbClausesConsidered: number;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** All active knowledge base clauses for an organisation. */
export async function getKBClauses(
  organisationId: string,
  category?: string | null,
) {
  return prisma.knowledgeBaseClause.findMany({
    where: {
      organisationId,
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
}

/** Distinct categories present in the org's knowledge base. */
export async function getKBCategories(organisationId: string) {
  const rows = await prisma.knowledgeBaseClause.findMany({
    where: { organisationId, isActive: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

/** Count of active clauses, optionally filtered by category. */
export async function getKBClauseCount(
  organisationId: string,
  category?: string | null,
) {
  return prisma.knowledgeBaseClause.count({
    where: {
      organisationId,
      isActive: true,
      ...(category ? { category } : {}),
    },
  });
}

/** Add a single clause to the knowledge base. */
export async function addKBClause(data: CreateKBClauseInput) {
  const existing = await prisma.knowledgeBaseClause.findFirst({
    where: {
      organisationId: data.organisationId,
      title: data.title,
      content: data.content,
      isActive: true,
    },
    select: { id: true },
  });

  if (existing) {
    // Update tags if provided, don't duplicate
    if (data.tags && data.tags.length > 0) {
      await prisma.knowledgeBaseClause.update({
        where: { id: existing.id },
        data: { tags: data.tags },
      });
    }
    return { created: false, id: existing.id };
  }

  return prisma.$transaction(async (tx) => {
    const clause = await tx.knowledgeBaseClause.create({
      data: {
        organisationId: data.organisationId,
        moduleId: data.moduleId ?? null,
        title: data.title,
        content: data.content,
        category: data.category,
        sourceDocument: data.sourceDocument ?? null,
        tags: data.tags ?? [],
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        organisationId: data.organisationId,
        actorId: data.actorId ?? null,
        entityType: "KnowledgeBaseClause",
        entityId: clause.id,
        action: AuditAction.CREATED,
        metadata: { title: data.title, category: data.category },
        newValue: { title: data.title, category: data.category },
      },
    });

    return { created: true, id: clause.id };
  });
}

/** Soft-delete a knowledge base clause. */
export async function removeKBClause(
  clauseId: string,
  organisationId: string,
  actorId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const clause = await tx.knowledgeBaseClause.findFirst({
      where: { id: clauseId, organisationId },
      select: { id: true, title: true, category: true },
    });
    if (!clause) {
      throw new Error(
        `KnowledgeBaseClause ${clauseId} not found in organisation ${organisationId}`,
      );
    }

    await tx.knowledgeBaseClause.update({
      where: { id: clauseId },
      data: { isActive: false },
    });

    await tx.auditLog.create({
      data: {
        organisationId,
        actorId: actorId ?? null,
        entityType: "KnowledgeBaseClause",
        entityId: clauseId,
        action: AuditAction.DELETED,
        metadata: { title: clause.title, category: clause.category },
      },
    });

    return { removed: true, id: clauseId };
  });
}

// ---------------------------------------------------------------------------
// Bulk Import — Upload a standard contract, extract its clauses via AI,
// store them in the knowledge base.
// ---------------------------------------------------------------------------

/**
 * Import clauses from an approved standard contract into the knowledge base.
 *
 * 1. Uses the AI client to extract clauses from the raw text.
 * 2. For each extracted clause, determines its category via the AI.
 * 3. Deduplicates against existing KB clauses.
 * 4. Persists new clauses atomically.
 */
export async function importFromApprovedContract(params: {
  organisationId: string;
  moduleId?: string | null;
  documentName: string;
  contractText: string;
  actorId?: string | null;
}): Promise<ImportResult> {
  const { organisationId, moduleId, documentName, contractText, actorId } =
    params;

  const client = getAIClient();

  // Step 1: Extract clauses from the contract text
  const extracted = await client.extractClauses({
    text: contractText,
  });

  if (extracted.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      clauses: [],
      error:
        "No clauses could be extracted from the provided text. The document may be empty or not a recognisable legal contract.",
    };
  }

  // Step 2: Determine category for each clause using the AI
  const categorized = await categoriseKBClauses(extracted.map((c) => ({
    title: c.title,
    content: c.content,
  })), client);

  // Step 3: Deduplicate and insert
  let imported = 0;
  let skipped = 0;
  const clauses: { title: string; category: string; imported: boolean }[] = [];

  for (let i = 0; i < extracted.length; i++) {
    const clause = extracted[i];
    const category = categorized[i]?.category ?? "General";
    const tags = categorized[i]?.tags ?? [];

    // Check for near-duplicates by title + content
    const duplicate = await prisma.knowledgeBaseClause.findFirst({
      where: {
        organisationId,
        title: clause.title,
        content: clause.content,
        isActive: true,
      },
      select: { id: true },
    });

    if (duplicate) {
      skipped++;
      clauses.push({
        title: clause.title,
        category,
        imported: false,
      });
      continue;
    }

    await addKBClause({
      organisationId,
      moduleId: moduleId ?? null,
      title: clause.title,
      content: clause.content,
      category,
      sourceDocument: documentName,
      tags,
      actorId,
    });

    imported++;
    clauses.push({ title: clause.title, category, imported: true });
  }

  return { imported, skipped, clauses };
}

// ---------------------------------------------------------------------------
// AI-Assisted Category Assignment
// ---------------------------------------------------------------------------

interface CategorisationResult {
  category: string;
  tags: string[];
}

const CATEGORISE_SYSTEM_PROMPT =
  "You are a legal contract taxonomy assistant. Assign each clause to one " +
  "of the following standard categories and suggest relevant tags. " +
  "Return ONLY valid JSON — an array of objects with fields: " +
  "category (string) and tags (array of strings). " +
  "Categories: Governing Law, Liability, Indemnity, Termination, " +
  "Confidentiality, Data Protection, IP Ownership, Payment Terms, " +
  "Entire Agreement, Warranties, Insurance, Force Majeure, Assignment, " +
  "Notices, Dispute Resolution, Definitions, General.";

/**
 * Use the AI client to categorise a batch of clauses. Falls back to "General"
 * on any failure.
 */
async function categoriseKBClauses(
  clauses: { title: string; content: string }[],
  client: ReturnType<typeof getAIClient>,
): Promise<CategorisationResult[]> {
  const clausesText = clauses
    .map(
      (c, i) =>
        `Clause ${i + 1}:\nTitle: ${c.title}\nContent: ${c.content.slice(0, 500)}`,
    )
    .join("\n\n");

  try {
    const response = await fetch(
      process.env.DEEPSEEK_API_KEY
        ? "https://api.deepseek.com/chat/completions"
        : process.env.OPENAI_API_KEY
          ? "https://api.openai.com/v1/chat/completions"
          : "",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model:
            process.env.DEEPSEEK_API_KEY
              ? "deepseek-chat"
              : process.env.OPENAI_API_KEY
                ? "gpt-4o-mini"
                : "",
          messages: [
            { role: "system", content: CATEGORISE_SYSTEM_PROMPT },
            { role: "user", content: clausesText },
          ],
          temperature: 0.1,
        }),
      },
    );

    if (!response.ok) {
      return clauses.map(() => ({ category: "General", tags: [] }));
    }

    const data = await response.json();
    const message: string | undefined = data?.choices?.[0]?.message?.content;
    if (!message) {
      return clauses.map(() => ({ category: "General", tags: [] }));
    }

    const parsed = JSON.parse(message);
    if (!Array.isArray(parsed)) {
      return clauses.map(() => ({ category: "General", tags: [] }));
    }

    return parsed.map((item: unknown) => {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return {
          category: String(obj.category ?? "General"),
          tags: Array.isArray(obj.tags)
            ? obj.tags.map((t) => String(t))
            : [],
        };
      }
      return { category: "General", tags: [] };
    });
  } catch {
    // On any failure — network, malformed JSON — fall back to "General"
    return clauses.map(() => ({ category: "General", tags: [] }));
  }
}

// ---------------------------------------------------------------------------
// Similarity Matching — "Is this new clause similar to any approved KB clause?"
// ---------------------------------------------------------------------------

const MATCHING_SYSTEM_PROMPT =
  "You are a legal clause matching assistant. Given a NEW clause and a list of " +
  "APPROVED clauses from the same category, determine if the new clause is " +
  "substantially similar to any approved clause. 'Substantially similar' means " +
  "the commercial intent and effect are the same, even if the wording differs. " +
  "Minor formatting changes, defined-term variations, and non-material word " +
  "choices do not count as differences. Return ONLY valid JSON with fields: " +
  "matched (boolean), matchedIndex (number, 0-based index into the approved " +
  "array, only if matched), confidence (number 0-1), reasoning (string, " +
  "one sentence explaining the match or mismatch).";

/**
 * Check whether a new clause matches any approved clause in the knowledge base.
 *
 * Strategy:
 *  1. Fetch all active KB clauses in the same category (via the caller).
 *  2. If the category has ≤ 40 KB clauses, send them all to the AI in one call.
 *  3. If the category has > 40 clauses, chunk them into batches of 40 and
 *     run sequentially — stop early if a high-confidence match is found.
 *  4. If the category is unknown or has 0 clauses, return { matched: false }.
 */
export async function matchAgainstKnowledgeBase(
  newClause: { title: string; content: string; category: string },
  organisationId: string,
): Promise<KBMatchResult> {
  const kbClauses = await prisma.knowledgeBaseClause.findMany({
    where: {
      organisationId,
      category: newClause.category,
      isActive: true,
    },
    select: { id: true, title: true, content: true },
    orderBy: { title: "asc" },
  });

  if (kbClauses.length === 0) {
    return {
      matched: false,
      confidence: 0,
      kbClausesConsidered: 0,
    };
  }

  const batchSize = 40;

  for (let batchStart = 0; batchStart < kbClauses.length; batchStart += batchSize) {
    const batch = kbClauses.slice(batchStart, batchStart + batchSize);
    const result = await runMatchBatch(newClause, batch);

    if (result.matched && result.confidence >= 0.85) {
      // High-confidence match — no need to check remaining batches
      return {
        matched: true,
        matchedClauseId: result.matchedId,
        matchedTitle: result.matchedTitle,
        matchedContent: result.matchedContent,
        confidence: result.confidence,
        kbClausesConsidered: kbClauses.length,
      };
    }
  }

  return {
    matched: false,
    confidence: 0,
    kbClausesConsidered: kbClauses.length,
  };
}

interface BatchMatchResult {
  matched: boolean;
  matchedId?: string;
  matchedTitle?: string;
  matchedContent?: string;
  confidence: number;
}

async function runMatchBatch(
  newClause: { title: string; content: string },
  batch: { id: string; title: string; content: string }[],
): Promise<BatchMatchResult> {
  const approvedList = batch
    .map(
      (c, i) =>
        `[${i}] Title: ${c.title}\nContent: ${c.content.slice(0, 800)}`,
    )
    .join("\n\n---\n\n");

  const userPrompt =
    `NEW CLAUSE:\nTitle: ${newClause.title}\nContent: ${newClause.content.slice(0, 1000)}\n\n` +
    `APPROVED CLAUSES (same category):\n${approvedList}`;

  try {
    const apiKey =
      process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
    const isDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);

    const response = await fetch(
      isDeepSeek
        ? "https://api.deepseek.com/chat/completions"
        : "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: isDeepSeek ? "deepseek-chat" : "gpt-4o-mini",
          messages: [
            { role: "system", content: MATCHING_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.0,
        }),
      },
    );

    if (!response.ok) {
      return { matched: false, confidence: 0 };
    }

    const data = await response.json();
    const message: string | undefined = data?.choices?.[0]?.message?.content;
    if (!message) {
      return { matched: false, confidence: 0 };
    }

    let parsed: Record<string, unknown>;
    try {
      // Strip code fences if present
      const cleaned = message
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return { matched: false, confidence: 0 };
    }

    const matched = Boolean(parsed.matched);
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0;
    const matchedIndex =
      typeof parsed.matchedIndex === "number" ? parsed.matchedIndex : -1;
    const matchedEntry =
      matched && matchedIndex >= 0 && matchedIndex < batch.length
        ? batch[matchedIndex]
        : null;

    return {
      matched,
      matchedId: matchedEntry?.id,
      matchedTitle: matchedEntry?.title,
      matchedContent: matchedEntry?.content,
      confidence,
    };
  } catch {
    return { matched: false, confidence: 0 };
  }
}
