// OpenAI AI client. SERVER-SIDE ONLY — never import into a browser/client
// component. Reads OPENAI_API_KEY from the environment at call time.
// Structurally mirrors deepseekClient, targeting the OpenAI chat completions API.

import { AIAnalysisRequest, AIAnalysisResult, AIClient, AIRiskLevel, ClauseExtractionRequest, ExtractedClause } from "./types";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt, parseClausesResponse } from "./clauseExtraction";

const PROMPT_VERSION = "legal-risk-v1";
const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are a legal risk analyst reviewing contract clauses. " +
  "Respond ONLY in JSON with fields: findings (string), suggestedResponse (string), " +
  "riskLevel (one of LOW, MEDIUM, HIGH, CRITICAL), confidence (number between 0 and 1).";

const VALID_RISK: AIRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function makeRunId(): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `openai-${Date.now()}-${rand}`;
}

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("OpenAIClient must not be used in the browser. AI calls are server-side only.");
  }
}

function buildUserPrompt(request: AIAnalysisRequest): string {
  const parts: string[] = [];
  if (request.context) parts.push(`Context: ${request.context}`);
  if (request.templateClause) parts.push(`Standard template clause:\n${request.templateClause}`);
  parts.push(`Clause / document to analyse:\n${request.content}`);
  return parts.join("\n\n");
}

function normaliseRiskLevel(value: unknown): AIRiskLevel {
  const upper = String(value ?? "").toUpperCase();
  return (VALID_RISK as string[]).includes(upper) ? (upper as AIRiskLevel) : "MEDIUM";
}

function normaliseConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

export class OpenAIClient implements AIClient {
  public readonly provider = "OPENAI";

  private _apiKey?: string;

  /** Override the API key from org settings. Falls back to OPENAI_API_KEY env var. */
  setApiKey(key: string) {
    this._apiKey = key;
  }

  private get apiKey(): string | undefined {
    return this._apiKey || process.env.OPENAI_API_KEY;
  }

  async analyse(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    assertServerSide();

    const apiKey = this.apiKey;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "OpenAI API key not configured. Set it in Settings or OPENAI_API_KEY in .env.",
      );
    }

    const startedAt = Date.now();
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(request) },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI API request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const durationMs = Date.now() - startedAt;

    const message: string | undefined = data?.choices?.[0]?.message?.content;
    if (!message) {
      throw new Error("OpenAI API returned no content to parse.");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(message);
    } catch {
      throw new Error(`OpenAI API returned non-JSON content: ${message.slice(0, 200)}`);
    }

    return {
      findings: String(parsed.findings ?? ""),
      suggestedResponse:
        parsed.suggestedResponse != null ? String(parsed.suggestedResponse) : undefined,
      riskLevel: normaliseRiskLevel(parsed.riskLevel),
      confidence: normaliseConfidence(parsed.confidence),
      tokensUsed: typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : undefined,
      durationMs,
      provider: this.provider,
      promptVersion: PROMPT_VERSION,
      runId: makeRunId(),
    };
  }

  async extractClauses(request: ClauseExtractionRequest): Promise<ExtractedClause[]> {
    assertServerSide();

    const apiKey = this.apiKey;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "OpenAI API key not configured. Set it in Settings or OPENAI_API_KEY in .env.",
      );
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildExtractionUserPrompt(request) },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI API request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const message: string | undefined = data?.choices?.[0]?.message?.content;
    if (!message) return [];
    return parseClausesResponse(message);
  }
}

export const openaiClient = new OpenAIClient();
