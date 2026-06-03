// Clause extraction service. SERVER-SIDE ONLY.
// Sends contract text to the org's configured AI provider, parses the returned
// clauses, cross-references them against the knowledge base, and persists them
// linked to the document.
//
// Knowledge base integration:
//   - Each extracted clause is categorised (heuristic title → category mapping)
//   - If a high-confidence KB match exists, the clause is auto-classified as
//     STANDARD with a note referencing the KB match — the AI's original
//     classification is treated as a fallback.
//   - KB matching failures are silent — the AI's original classification stands.

import { prisma } from "../lib/prisma";
import { AuditAction, ClauseStatus, DocumentStatus, RiskLevel } from "@prisma/client";
import { getAIClient, configureAIClientKeys } from "../agents/aiClientFactory";
import { matchAgainstKnowledgeBase, type KBMatchResult } from "./knowledgeBaseClauseService";

// ---------------------------------------------------------------------------
// Category mapping — deterministic title → category for KB matching.
// This avoids an extra AI call during extraction; the bulk import flow
// (importFromApprovedContract) uses AI categorisation for precision.
// ---------------------------------------------------------------------------

const TITLE_TO_CATEGORY: Record<string, string> = {
  "governing law": "Governing Law",
  "jurisdiction": "Governing Law",
  "governing law and jurisdiction": "Governing Law",
  "liability": "Liability",
  "limitation of liability": "Liability",
  "liability cap": "Liability",
  "indemnity": "Indemnity",
  "indemnification": "Indemnity",
  "termination": "Termination",
  "term and termination": "Termination",
  "confidentiality": "Confidentiality",
  "confidential information": "Confidentiality",
  "data protection": "Data Protection",
  "data processing": "Data Protection",
  "gdpr": "Data Protection",
  "intellectual property": "IP Ownership",
  "ip ownership": "IP Ownership",
  "ip rights": "IP Ownership",
  "payment": "Payment Terms",
  "payment terms": "Payment Terms",
  "fees": "Payment Terms",
  "entire agreement": "Entire Agreement",
  "warranties": "Warranties",
  "warranty": "Warranties",
  "insurance": "Insurance",
  "force majeure": "Force Majeure",
  "assignment": "Assignment",
  "notices": "Notices",
  "dispute resolution": "Dispute Resolution",
  "definitions": "Definitions",
  "obligations": "General",
  "term": "Termination",
};

function inferCategory(title: string): string {
  const key = title.toLowerCase().trim();
  for (const [pattern, category] of Object.entries(TITLE_TO_CATEGORY)) {
    if (key.includes(pattern)) return category;
  }
  return "General";
}

// ---------------------------------------------------------------------------
// KB match result → Clause override
// ---------------------------------------------------------------------------

interface KBMatchOverride {
  status: ClauseStatus;
  riskLevel: RiskLevel;
  riskNote: string | null;
}

function kbMatchToOverride(match: KBMatchResult): KBMatchOverride | null {
  if (!match.matched || match.confidence < 0.85) return null;

  return {
    status: ClauseStatus.STANDARD,
    riskLevel: RiskLevel.LOW,
    riskNote: `Matches approved KB clause "${match.matchedTitle ?? "unknown"}" (confidence: ${(match.confidence * 100).toFixed(0)}%). Considered ${match.kbClausesConsidered} KB clauses in this category.`,
  };
}

// ---------------------------------------------------------------------------
// Template section matching — pairs extracted clauses with their standard
// template counterparts so the UI can show side-by-side diffs via DiffBlock.
// ---------------------------------------------------------------------------

const SECTION_RE = /^\s*(\d+)\.\s+([A-Z][A-Za-z0-9 /,&'()-]+?)\s*$/gm;

interface TemplateSection {
  index: number;
  title: string;
  content: string;
}

function parseTemplateSections(templateContent: string): TemplateSection[] | null {
  const sections: TemplateSection[] = [];
  const matches = [...templateContent.matchAll(SECTION_RE)];
  if (matches.length === 0) return null;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? templateContent.length) : templateContent.length;
    sections.push({ index: parseInt(m[1], 10), title: m[2].trim(), content: templateContent.slice(start, end).trim() });
  }
  return sections;
}

/** Score how well a template section title matches a clause title.
 *  Exact word matches score 1.0, substring matches score 0.6 to prefer exact hits. */
function titleMatchScore(clauseTitle: string, sectionTitle: string): number {
  const clauseWords = clauseTitle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const sectionWords = sectionTitle.toLowerCase().split(/\s+/);
  if (clauseWords.length === 0) return 0;
  let total = 0;
  for (const cw of clauseWords) {
    const exact = sectionWords.some((sw) => sw === cw);
    if (exact) { total += 1.0; continue; }
    const sub = sectionWords.some((sw) => sw.includes(cw) || cw.includes(sw));
    if (sub) { total += 0.6; }
  }
  return total / clauseWords.length;
}

/** Find the best-matching template section for a clause by title similarity, falling back to position. */
function findMatchingTemplateSection(
  clauseIndex: number,
  clauseTitle: string,
  sections: TemplateSection[],
): string | null {
  // Score every section by title similarity
  let best: { section: TemplateSection; score: number } | null = null;
  for (const s of sections) {
    const score = titleMatchScore(clauseTitle, s.title);
    if (score >= 0.5 && (!best || score > best.score)) {
      best = { section: s, score };
    }
  }
  if (best) return `${best.section.index}. ${best.section.title}\n${best.section.content}`;

  // Last resort: match by position
  const byIndex = sections.find((s) => s.index === clauseIndex + 1);
  if (byIndex) return `${byIndex.index}. ${byIndex.title}\n${byIndex.content}`;

  return null;
}

// ---------------------------------------------------------------------------
// Main extraction entry point
// ---------------------------------------------------------------------------

/**
 * Extracts clauses from contract text and saves them against the document.
 *
 * On a successful extraction (>=1 clause): cross-references each clause against
 * the knowledge base, saves clauses, moves the document to UNDER_REVIEW, and
 * writes an AI_ANALYSED audit entry — all atomically.
 *
 * On malformed model output the client returns []; this function then saves
 * nothing and leaves the document at its current status (the caller can surface
 * an extractionError). It never throws on malformed JSON. Provider/transport
 * errors DO propagate so the upload route can report them.
 */
export async function extractClauses(
  documentId: string,
  extractedText: string,
  templateId?: string | null,
) {
  const document = await prisma.document.findFirst({
    where: { id: documentId },
    select: { id: true, organisationId: true },
  });
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  const [settings, template] = await Promise.all([
    prisma.organisationSettings.findUnique({
      where: { organisationId: document.organisationId },
      select: { defaultAIProvider: true, deepseekApiKey: true, openaiApiKey: true, localAiUrl: true },
    }),
    templateId
      ? prisma.template.findFirst({ where: { id: templateId, isActive: true }, select: { content: true } })
      : Promise.resolve(null),
  ]);

  // Parse template into numbered sections for per-clause matching
  const templateSections = template?.content ? parseTemplateSections(template.content) : null;

  // Inject org-level API keys so they take precedence over env vars
  configureAIClientKeys({
    deepseekApiKey: settings?.deepseekApiKey,
    openaiApiKey: settings?.openaiApiKey,
    localAiUrl: settings?.localAiUrl,
  });

  const client = getAIClient(settings?.defaultAIProvider ?? null);

  const extracted = await client.extractClauses({
    text: extractedText,
    templateContent: template?.content,
  });

  if (extracted.length === 0) {
    return [];
  }

  // --- Knowledge base cross-reference (before the transaction) ---
  // Match each clause against the KB; failures are silent — AI classification
  // is the fallback.
  const kbMatches = new Map<number, KBMatchResult>();
  const matchPromises = extracted.map(async (c, i) => {
    const category = inferCategory(c.title);
    try {
      const result = await matchAgainstKnowledgeBase(
        { title: c.title, content: c.content, category },
        document.organisationId,
      );
      if (result.matched && result.confidence >= 0.85) {
        kbMatches.set(i, result);
      }
    } catch {
      // KB matching is best-effort; failure doesn't block extraction.
    }
  });

  await Promise.allSettled(matchPromises);

  const kbMatchCount = kbMatches.size;

  // --- Persist (atomic transaction) ---
  return prisma.$transaction(async (tx) => {
    const saved = [];
    for (let i = 0; i < extracted.length; i++) {
      const c = extracted[i];
      const kbOverride = kbMatches.has(i)
        ? kbMatchToOverride(kbMatches.get(i)!)
        : null;

      const templateText = templateSections
        ? findMatchingTemplateSection(i, c.title, templateSections)
        : null;

      // Only auto-STANDARD if the clause content is virtually identical to template (≥98%)
      let finalStatus = kbOverride?.status ?? (c.status as ClauseStatus);
      let finalRisk = kbOverride?.riskLevel ?? (c.riskLevel as RiskLevel);
      let finalNote = kbOverride?.riskNote ?? c.riskNote;
      if (!kbOverride && templateText) {
        const clauseWords = new Set(c.content.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const tmplWords = templateText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const overlap = tmplWords.filter(w => clauseWords.has(w)).length;
        if (tmplWords.length > 0 && overlap / tmplWords.length >= 0.98) {
          finalStatus = ClauseStatus.STANDARD;
          finalRisk = RiskLevel.LOW;
          finalNote = "Matches standard template — no deviations detected.";
        }
      }

      const clause = await tx.clause.create({
        data: {
          organisationId: document.organisationId,
          documentId: document.id,
          title: c.title,
          content: c.content,
          templateClause: templateText,
          status: finalStatus,
          riskLevel: finalRisk,
          riskNote: finalNote,
          orderIndex: i + 1,
        },
      });
      saved.push(clause);
    }

    await tx.document.update({
      where: { id: document.id },
      data: { status: DocumentStatus.UNDER_REVIEW },
    });

    await tx.auditLog.create({
      data: {
        organisationId: document.organisationId,
        entityType: "Document",
        entityId: document.id,
        action: AuditAction.AI_ANALYSED,
        metadata: {
          source: "upload-extraction",
          provider: client.provider,
          clauseCount: saved.length,
          kbMatchedCount: kbMatchCount,
        },
      },
    });

    return saved;
  });
}
