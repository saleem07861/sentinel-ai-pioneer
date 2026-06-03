// AI client factory. SERVER-SIDE ONLY.
// Selects the active AI client by precedence:
//   1. explicit `provider` argument (e.g. an org's defaultAIProvider)
//   2. AI_PROVIDER environment variable
//   3. MOCK (deterministic fallback)
//
// API key resolution precedence (per provider):
//   1. org-level API key (from OrganisationSettings, passed via configureKeys)
//   2. environment variable (DEEPSEEK_API_KEY / OPENAI_API_KEY / LOCAL_AI_URL)
//   3. error (for real providers) or silent fallback (for Mock)

import { AIProvider } from "@prisma/client";
import { AIClient } from "./types";
import { mockClient } from "./mockClient";
import { deepseekClient, DeepSeekClient } from "./deepseekClient";
import { openaiClient, OpenAIClient } from "./openaiClient";
import { localClient } from "./localClient";

/** Org-level keys that override env vars when set. */
export interface AIClientKeys {
  deepseekApiKey?: string | null;
  openaiApiKey?: string | null;
  localAiUrl?: string | null;
}

/** Inject org-level API keys into the singleton clients before use. */
export function configureAIClientKeys(keys: AIClientKeys) {
  if (keys.deepseekApiKey) deepseekClient.setApiKey(keys.deepseekApiKey);
  if (keys.openaiApiKey) openaiClient.setApiKey(keys.openaiApiKey);
}

export function getAIClient(provider?: AIProvider | null): AIClient {
  const source = provider ?? process.env.AI_PROVIDER ?? "";
  const key = String(source).trim().toUpperCase();
  const origin = provider
    ? "org settings"
    : process.env.AI_PROVIDER
      ? "AI_PROVIDER env"
      : "default";

  switch (key) {
    case "DEEPSEEK":
      console.log(`AI provider: DEEPSEEK (${origin})`);
      return deepseekClient;
    case "OPENAI":
      console.log(`AI provider: OPENAI (${origin})`);
      return openaiClient;
    case "LOCAL":
      console.log(`AI provider: LOCAL (${origin})`);
      return localClient;
    case "MOCK":
      console.log(`AI provider: MOCK (${origin})`);
      return mockClient;
    default:
      if (key !== "") {
        console.log(
          `AI provider: "${key}" has no client (${origin}) — falling back to MOCK`,
        );
      } else {
        console.log("AI provider: not set — defaulting to MOCK");
      }
      return mockClient;
  }
}
