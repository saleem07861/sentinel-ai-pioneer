// GET /api/documents?organisationId=...&status=...&riskLevel=...
// Lists active documents for an org, optionally filtered by status / riskLevel.

import { DocumentStatus, RiskLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDocumentsByOrg } from "@/services/documentService";
import { badRequest, isEnumValue, jsonOk, requireParam, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const organisationId = requireParam(url, "organisationId");
    if (!organisationId) return badRequest("organisationId is required");

    const statusParam = url.searchParams.get("status");
    if (statusParam && !isEnumValue(DocumentStatus, statusParam)) {
      return badRequest(`Invalid status: ${statusParam}`);
    }

    const riskParam = url.searchParams.get("riskLevel");
    if (riskParam && !isEnumValue(RiskLevel, riskParam)) {
      return badRequest(`Invalid riskLevel: ${riskParam}`);
    }

    let documents = await getDocumentsByOrg(organisationId);
    if (statusParam) documents = documents.filter((d) => d.status === statusParam);
    if (riskParam) documents = documents.filter((d) => d.riskLevel === riskParam);

    // Resolve uploadedBy names in a single batched query (service returns ids only).
    const uploaderIds = [...new Set(documents.map((d) => d.uploadedById).filter(Boolean))] as string[];
    const uploaders = uploaderIds.length
      ? await prisma.person.findMany({
          where: { id: { in: uploaderIds }, isActive: true },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const nameById = new Map(uploaders.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));

    const result = documents.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      riskLevel: d.riskLevel,
      moduleId: d.moduleId,
      templateId: d.templateId,
      uploadedBy: d.uploadedById
        ? { id: d.uploadedById, name: nameById.get(d.uploadedById) ?? null }
        : null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return jsonOk({ documents: result, count: result.length });
  } catch (error) {
    return serverError(error);
  }
}
