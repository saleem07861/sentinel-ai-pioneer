// Common AI adapter interface.
// All AI work happens server-side only — these types and the clients that
// implement them must never be imported into browser/client components.

export type AIRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AIAnalysisRequest {
  documentId?: string;
  clauseId?: string;
  content: string;
  templateClause?: string;
  context?: string;
}

export interface AIAnalysisResult {
  findings: string;
  suggestedResponse?: string;
  riskLevel: AIRiskLevel;
  confidence: number;
  tokensUsed?: number;
  durationMs?: number;
  provider: string;
  promptVersion: string;
  runId: string;
}

export type ClauseStatusValue =
  | "STANDARD"
  | "DEVIATION"
  | "FLAGGED"
  | "MISSING"
  | "ACCEPTABLE";

export interface ClauseExtractionRequest {
  text: string;
  /** Optional standard template content to compare clauses against. */
  templateContent?: string;
}

export interface ExtractedClause {
  title: string;
  content: string;
  status: ClauseStatusValue;
  riskLevel: AIRiskLevel;
  riskNote: string | null;
}

export interface AIClient {
  analyse(request: AIAnalysisRequest): Promise<AIAnalysisResult>;
  /**
   * Extract distinct clauses from raw contract text as structured data.
   * Implementations must never throw on malformed model output — they return
   * an empty array instead.
   */
  extractClauses(request: ClauseExtractionRequest): Promise<ExtractedClause[]>;
  provider: string;
}

