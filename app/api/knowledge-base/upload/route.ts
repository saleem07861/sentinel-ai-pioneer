// POST /api/knowledge-base/upload
// Upload a standard approved contract (.txt, .pdf, .docx) to be extracted
// and imported into the knowledge base clause corpus.
// Multipart form: file + organisationId + documentName

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { detectType, extractText } from "@/lib/extractText";
import { importFromApprovedContract } from "@/services/knowledgeBaseClauseService";
import { badRequest, jsonOk, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const organisationId = form.get("organisationId");
    const moduleId = form.get("moduleId");
    const actorId = form.get("actorId");
    const documentNameField = form.get("documentName");

    if (!(file instanceof File)) return badRequest("file is required");
    if (typeof organisationId !== "string" || !organisationId)
      return badRequest("organisationId is required");

    const type = detectType(file.name);
    if (!type) return badRequest("Only PDF, .docx, and .txt files are supported");
    if (file.size > MAX_BYTES) return badRequest("File exceeds 10MB limit");

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save the uploaded file
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const filename = `${randomUUID()}-kb-${safeName}`;
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    const documentName =
      typeof documentNameField === "string" && documentNameField.trim()
        ? documentNameField.trim()
        : file.name.replace(/\.[^.]+$/, "");

    // Extract text
    let contractText = "";
    try {
      contractText = await extractText(buffer, type);
    } catch (e) {
      return badRequest(
        `Text extraction failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }

    if (!contractText.trim()) {
      return badRequest("No text could be extracted from the document");
    }

    // Import clauses into the knowledge base
    const result = await importFromApprovedContract({
      organisationId,
      moduleId:
        typeof moduleId === "string" && moduleId ? moduleId : undefined,
      documentName,
      contractText,
      actorId:
        typeof actorId === "string" && actorId ? actorId : undefined,
    });

    // Also create/update a Template so it appears in the upload dropdown
    const existingTemplate = await prisma.template.findFirst({
      where: { organisationId, name: documentName, isActive: true },
      select: { id: true },
    });
    if (existingTemplate) {
      await prisma.template.update({
        where: { id: existingTemplate.id },
        data: { content: contractText },
      });
    } else {
      await prisma.template.create({
        data: {
          organisationId,
          name: documentName,
          content: contractText,
          isActive: true,
        },
      });
    }

    return jsonOk(
      {
        documentName,
        fileUrl: `/uploads/${filename}`,
        ...result,
      },
      201,
    );
  } catch (error) {
    return serverError(error);
  }
}
