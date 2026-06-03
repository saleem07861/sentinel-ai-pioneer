// PATCH /api/documents/[id]/status
// Body: { status?: DocumentStatus, title?: string, actorId?: string }
// Updates the document status and/or title.

import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";
import { updateDocumentStatus } from "@/services/documentService";
import { badRequest, isEnumValue, isNotFoundError, jsonOk, notFound, serverError } from "@/lib/http";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON");
    }

    const { status, title, actorId } = (body ?? {}) as { status?: unknown; title?: unknown; actorId?: unknown };

    if (actorId != null && typeof actorId !== "string") {
      return badRequest("actorId must be a string");
    }

    // Title-only update
    if (typeof title === "string" && title.trim()) {
      const updated = await prisma.document.update({
        where: { id: params.id },
        data: { title: title.trim() },
      });
      return jsonOk(updated);
    }

    // Status update
    if (!status) return badRequest("status is required");
    if (!isEnumValue(DocumentStatus, status)) {
      return badRequest(`Invalid status: ${String(status)}`);
    }

    const updated = await updateDocumentStatus(params.id, status, actorId ?? null);
    return jsonOk(updated);
  } catch (error) {
    if (isNotFoundError(error)) return notFound(`Document ${params.id} not found`);
    return serverError(error);
  }
}
