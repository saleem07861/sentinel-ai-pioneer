// Mock AI client — deterministic, offline analysis used as the default
// fallback when no provider API key is configured. No network calls.
// Now compares extracted clauses against template content to detect deviations.

import { AIAnalysisRequest, AIAnalysisResult, AIClient, AIRiskLevel, ClauseExtractionRequest, ClauseStatusValue, ExtractedClause } from "./types";

const PROMPT_VERSION = "legal-risk-v1";
const HEADER_RE = /^\s*(\d+)\.\s+([A-Z][A-Za-z0-9 /,&'()-]+?)\s*$/gm;

function makeRunId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeDurationMs(): number {
  return 200 + Math.floor(Math.random() * 601);
}

// ---------------------------------------------------------------------------
// Clause extraction with template comparison
// ---------------------------------------------------------------------------

interface TmplSection { index: number; title: string; content: string; }

function parseTemplateSections(templateContent: string): TmplSection[] {
  const sections: TmplSection[] = [];
  const matches = [...templateContent.matchAll(HEADER_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? templateContent.length) : templateContent.length;
    sections.push({ index: parseInt(m[1], 10), title: m[2].trim().toLowerCase(), content: templateContent.slice(start, end).trim() });
  }
  return sections;
}

function mockExtractClauses(text: string, templateContent?: string): ExtractedClause[] {
  const matches = [...text.matchAll(HEADER_RE)];
  if (matches.length === 0) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return [{ title: "Document", content: trimmed.slice(0, 2000), status: "STANDARD", riskLevel: "LOW", riskNote: null }];
  }

  const tmplSections = templateContent ? parseTemplateSections(templateContent) : [];

  return matches.map((m) => {
    const start = (m.index ?? 0) + m[0].length;
    const endIdx = m.index ?? 0;
    const nextMatch = [...text.matchAll(HEADER_RE)].find(m2 => (m2.index ?? 0) > endIdx + m[0].length);
    const end = nextMatch ? (nextMatch.index ?? text.length) : text.length;
    const content = text.slice(start, end).trim();
    const rawTitle = m[2].trim();
    const title = rawTitle.charAt(0) + rawTitle.slice(1).toLowerCase();

    let status: ClauseStatusValue = "STANDARD";
    let riskLevel: AIRiskLevel = "LOW";
    let riskNote: string | null = null;

    // Compare against matching template section by section number
    const sectionNum = parseInt(m[1], 10);
    const tmpl = tmplSections.find((s) => s.index === sectionNum);

    if (tmpl) {
      const clauseWords = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const tmplWords = tmpl.content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const overlap = tmplWords.filter(w => clauseWords.has(w)).length;
      const similarity = tmplWords.length > 0 ? overlap / tmplWords.length : 0;

      if (similarity < 0.95) {
        status = "DEVIATION";
        riskLevel = similarity < 0.8 ? "HIGH" : "MEDIUM";
        riskNote = `Differs from standard template (${Math.round(similarity * 100)}% match). Review the changes.`;
      } else {
        riskNote = "Matches standard template — no deviations detected.";
      }
    } else if (tmplSections.length > 0) {
      // Section exists in contract but not in template
      status = "DEVIATION";
      riskLevel = "MEDIUM";
      riskNote = "No matching section in standard template — new or restructured clause.";
    }

    return { title, content, status, riskLevel, riskNote };
  });
}

// ---------------------------------------------------------------------------
// Document-level analysis
// ---------------------------------------------------------------------------

function profileFor(content: string): { riskLevel: AIRiskLevel; confidence: number; findings: string; suggestedResponse?: string } {
  const text = content.toLowerCase().trim();

  if (text.length === 0 || text.includes("governing law")) {
    return {
      riskLevel: "CRITICAL", confidence: 0.95,
      findings: "No enforceable governing law or jurisdiction provision could be identified. Absent an express choice of law and forum, disputes risk falling under an unintended jurisdiction.",
      suggestedResponse: "Insert an express governing law and exclusive jurisdiction clause naming England & Wales.",
    };
  }
  if (text.includes("liability")) {
    return {
      riskLevel: "HIGH", confidence: 0.91,
      findings: "The limitation of liability deviates materially from the standard position. The cap exceeds the benchmark, exposing the client to disproportionate financial risk.",
      suggestedResponse: "Propose realigning the liability cap to 2x annual fees and carve out customary uncapped heads (confidentiality, IP infringement).",
    };
  }
  if (text.includes("termination")) {
    return {
      riskLevel: "LOW", confidence: 0.88,
      findings: "The termination provision is broadly consistent with market practice. The notice period departs modestly from the standard but remains commercially reasonable.",
      suggestedResponse: "Acceptable as drafted. Optionally align the notice period to the standard 30 days for consistency.",
    };
  }
  return {
    riskLevel: "MEDIUM", confidence: 0.8,
    findings: "The clause is generally serviceable but contains language that would benefit from tightening. Scope and definitions are somewhat broad.",
    suggestedResponse: "Recommend minor drafting amendments to narrow scope and define key terms explicitly.",
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class MockClient implements AIClient {
  public readonly provider = "MOCK";

  async extractClauses(request: ClauseExtractionRequest): Promise<ExtractedClause[]> {
    return mockExtractClauses(request.text ?? "", request.templateContent);
  }

  async analyse(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const profile = profileFor(request.content ?? "");
    return {
      findings: profile.findings,
      suggestedResponse: profile.suggestedResponse,
      riskLevel: profile.riskLevel,
      confidence: profile.confidence,
      tokensUsed: undefined,
      durationMs: makeDurationMs(),
      provider: this.provider,
      promptVersion: PROMPT_VERSION,
      runId: makeRunId(),
    };
  }
}

export const mockClient = new MockClient();
