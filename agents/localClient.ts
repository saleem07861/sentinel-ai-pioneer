// Local AI client (e.g. Ollama at http://localhost:11434). SERVER-SIDE ONLY.
// Stub for now: it logs and delegates to the mock client so the rest of the
// system has a working result while no local model is wired up.

import { AIAnalysisRequest, AIAnalysisResult, AIClient, ClauseExtractionRequest, ExtractedClause } from "./types";
import { mockClient } from "./mockClient";

const PROMPT_VERSION = "legal-risk-v1";

function makeRunId(): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `local-${Date.now()}-${rand}`;
}

export class LocalClient implements AIClient {
  public readonly provider = "LOCAL";

  async analyse(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const localUrl = process.env.LOCAL_AI_URL;
    console.log(`Local AI client: not yet configured (LOCAL_AI_URL=${localUrl ?? "unset"})`);

    // Replace with real local model call when LOCAL_AI_URL is configured
    // (e.g. POST to `${localUrl}/api/chat` for Ollama and parse the response).
    const result = await mockClient.analyse(request);

    return {
      ...result,
      provider: this.provider,
      promptVersion: PROMPT_VERSION,
      runId: makeRunId(),
    };
  }

  async extractClauses(request: ClauseExtractionRequest): Promise<ExtractedClause[]> {
    console.log("Local AI client: not yet configured — delegating clause extraction to mock");
    // Replace with real local model call when LOCAL_AI_URL is configured
    return mockClient.extractClauses(request);
  }
}

export const localClient = new LocalClient();
