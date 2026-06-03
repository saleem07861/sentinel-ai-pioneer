// Shared clause-extraction prompt + robust response parsing for the API-backed
// clients (DeepSeek, OpenAI). Never throws on malformed model output.

import { ClauseExtractionRequest, ClauseStatusValue, ExtractedClause, AIRiskLevel } from "./types";

export const EXTRACTION_SYSTEM_PROMPT =
  "You are a legal contract analyst. Extract the distinct clauses from the " +
  "contract text provided. Return ONLY valid JSON, no markdown, no explanation.";

const VALID_STATUS: ClauseStatusValue[] = ["STANDARD", "DEVIATION", "FLAGGED", "MISSING", "ACCEPTABLE"];
const VALID_RISK: AIRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function buildExtractionUserPrompt(request: ClauseExtractionRequest): string {
  const templateBlock = request.templateContent
    ? `Compare against this standard template when assessing status:\n${request.templateContent}\n\n`
    : "";

  return (
    "Extract all distinct clauses from this contract.\n" +
    "For each clause return:\n" +
    "- title: short clause name (e.g. 'Liability Cap', 'Governing Law')\n" +
    "- content: the full clause text as written\n" +
    "- status: one of STANDARD, DEVIATION, FLAGGED, MISSING, ACCEPTABLE (compare against standard commercial contract expectations)\n" +
    "- riskLevel: one of LOW, MEDIUM, HIGH, CRITICAL\n" +
    "- riskNote: one sentence explaining any risk or deviation (null if STANDARD)\n\n" +
    "Return as JSON array:\n[{ title, content, status, riskLevel, riskNote }]\n\n" +
    templateBlock +
    `Contract text:\n${request.text}\n`
  );
}

/** Remove ```json ... ``` (or plain ```) fences a model may wrap output in. */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fence ? fence[1].trim() : trimmed;
}

function normaliseStatus(value: unknown): ClauseStatusValue {
  const upper = String(value ?? "").toUpperCase();
  return (VALID_STATUS as string[]).includes(upper) ? (upper as ClauseStatusValue) : "STANDARD";
}

function normaliseRisk(value: unknown): AIRiskLevel {
  const upper = String(value ?? "").toUpperCase();
  return (VALID_RISK as string[]).includes(upper) ? (upper as AIRiskLevel) : "MEDIUM";
}

/**
 * Parse a model response into clauses. Strips markdown fences, accepts either a
 * bare array or an object wrapping an array. Returns [] (and logs) on failure.
 */
export function parseClausesResponse(content: string): ExtractedClause[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(content));
  } catch {
    console.error("[extractClauses] malformed JSON from provider:", content.slice(0, 500));
    return [];
  }

  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === "object") {
    // Tolerate { clauses: [...] } or the first array-valued property.
    const obj = parsed as Record<string, unknown>;
    const candidate = Array.isArray(obj.clauses)
      ? obj.clauses
      : Object.values(obj).find((v) => Array.isArray(v));
    if (!Array.isArray(candidate)) {
      console.error("[extractClauses] JSON had no clause array:", content.slice(0, 500));
      return [];
    }
    arr = candidate;
  } else {
    return [];
  }

  return arr
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
    .map((c) => {
      const status = normaliseStatus(c.status);
      const rawNote = c.riskNote;
      const riskNote = rawNote == null || rawNote === "" ? null : String(rawNote);
      return {
        title: String(c.title ?? "Untitled clause").trim() || "Untitled clause",
        content: String(c.content ?? ""),
        status,
        riskLevel: normaliseRisk(c.riskLevel),
        riskNote: status === "STANDARD" ? riskNote : riskNote,
      };
    })
    .filter((c) => c.content.length > 0 || c.title !== "Untitled clause");
}
