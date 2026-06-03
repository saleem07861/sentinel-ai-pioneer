// PUT /api/settings — update organisation settings including API keys.
// GET /api/settings?organisationId=... — read current settings.
// Admin only — returns 403 for non-admin.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AIProvider } from "@prisma/client";
import { badRequest, jsonOk, notFound, serverError, requireParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });

    const url = new URL(request.url);
    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const settings = await prisma.organisationSettings.findUnique({
      where: { organisationId },
    });

    if (!settings) return notFound("Settings not found for this organisation");

    // Never return API keys to the client — only return whether they're set
    return jsonOk({
      id: settings.id,
      organisationId: settings.organisationId,
      defaultAIProvider: settings.defaultAIProvider,
      requireHumanApproval: settings.requireHumanApproval,
      auditLoggingEnabled: settings.auditLoggingEnabled,
      timezone: settings.timezone,
      deepseekApiKeySet: Boolean(settings.deepseekApiKey),
      openaiApiKeySet: Boolean(settings.openaiApiKey),
      localAiUrlSet: Boolean(settings.localAiUrl),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const {
      organisationId,
      defaultAIProvider,
      requireHumanApproval,
      auditLoggingEnabled,
      timezone,
      deepseekApiKey,
      openaiApiKey,
      localAiUrl,
    } = (body ?? {}) as Record<string, unknown>;

    if (!organisationId || typeof organisationId !== "string")
      return badRequest("organisationId is required");

    const VALID_PROVIDERS = Object.values(AIProvider) as string[];
    const data: Record<string, unknown> = {};

    if (typeof defaultAIProvider === "string" && VALID_PROVIDERS.includes(defaultAIProvider.toUpperCase())) {
      data.defaultAIProvider = defaultAIProvider.toUpperCase() as AIProvider;
    }
    if (typeof requireHumanApproval === "boolean") {
      data.requireHumanApproval = requireHumanApproval;
    }
    if (typeof auditLoggingEnabled === "boolean") {
      data.auditLoggingEnabled = auditLoggingEnabled;
    }
    if (typeof timezone === "string") {
      data.timezone = timezone || null;
    }

    // API keys: only update if a non-empty string is provided.
    // Empty strings are ignored (keep existing value).
    // To clear a key, set to null explicitly.
    if (deepseekApiKey === null) data.deepseekApiKey = null;
    else if (typeof deepseekApiKey === "string" && deepseekApiKey.trim()) data.deepseekApiKey = deepseekApiKey.trim();

    if (openaiApiKey === null) data.openaiApiKey = null;
    else if (typeof openaiApiKey === "string" && openaiApiKey.trim()) data.openaiApiKey = openaiApiKey.trim();

    if (localAiUrl === null) data.localAiUrl = null;
    else if (typeof localAiUrl === "string" && localAiUrl.trim()) data.localAiUrl = localAiUrl.trim();

    const settings = await prisma.organisationSettings.update({
      where: { organisationId },
      data,
    });

    // Don't return keys in response
    return jsonOk({
      id: settings.id,
      organisationId: settings.organisationId,
      defaultAIProvider: settings.defaultAIProvider,
      requireHumanApproval: settings.requireHumanApproval,
      auditLoggingEnabled: settings.auditLoggingEnabled,
      timezone: settings.timezone,
      deepseekApiKeySet: Boolean(settings.deepseekApiKey),
      openaiApiKeySet: Boolean(settings.openaiApiKey),
      localAiUrlSet: Boolean(settings.localAiUrl),
    });
  } catch (error) {
    return serverError(error);
  }
}
