// POST /api/documents/upload
// Multipart upload of a PDF / .docx (/.txt for testing). Saves the file to
// /uploads, extracts text, creates a Document, then runs clause extraction.
// Never crashes on partial extraction.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { detectType, extractText } from "@/lib/extractText";
import { extractClauses } from "@/services/extractionService";
import { extractMetadata } from "@/services/documentService";
import { runDocumentAnalysis } from "@/agents/analysisAgent";
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
    const uploadedById = form.get("uploadedById");
    const templateId = form.get("templateId");
    const titleField = form.get("title");

    if (!(file instanceof File)) return badRequest("file is required");
    if (typeof organisationId !== "string" || !organisationId) return badRequest("organisationId is required");
    if (typeof moduleId !== "string" || !moduleId) return badRequest("moduleId is required");

    const type = detectType(file.name);
    if (!type) return badRequest("Only PDF and .docx files are supported");
    if (file.size > MAX_BYTES) return badRequest("File exceeds 10MB limit");

    const buffer = Buffer.from(await file.arrayBuffer());

    // Persist the file locally (no cloud storage).
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const filename = `${randomUUID()}-${safeName}`;
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    const title =
      typeof titleField === "string" && titleField.trim()
        ? titleField.trim()
        : file.name.replace(/\.[^.]+$/, "");

    // Extract text — failures must not crash the upload.
    let extractedText = "";
    let extractionError: string | undefined;
    try {
      extractedText = await extractText(buffer, type);
    } catch (e) {
      extractionError = e instanceof Error ? e.message : "Text extraction failed";
    }

    // Always create the Document record (status UPLOADED).
    // Extract metadata (parties, contract type, date) from the raw text.
    const metadata = extractedText ? extractMetadata(extractedText) : {};

    // Merge company name into parties if it differs from detected parties
    if (typeof titleField === "string" && titleField.trim()) {
      const existing = (metadata.parties ?? []) as string[];
      const companyName = titleField.trim();
      const alreadyPresent = existing.some(
        (p) => p.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(p.toLowerCase()),
      );
      if (!alreadyPresent) {
        metadata.parties = [companyName, ...existing];
      }
    }

    const document = await prisma.document.create({
      data: {
        organisationId,
        moduleId,
        uploadedById: typeof uploadedById === "string" && uploadedById ? uploadedById : null,
        title,
        status: "UPLOADED",
        fileUrl: `/uploads/${filename}`,
        fileType: type,
        fileSize: file.size,
        templateId: typeof templateId === "string" && templateId ? templateId : null,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    // No usable text → return the document with an extractionError.
    if (extractionError || !extractedText.trim()) {
      return jsonOk(
        {
          document,
          clauses: [],
          extractionError: extractionError ?? "No text could be extracted from the document",
        },
        201,
      );
    }

    // Clause extraction (Part C). Provider/transport errors are reported but
    // do not crash the request.
    let clauses: unknown[] = [];
    let clauseError: string | undefined;
    try {
      clauses = await extractClauses(document.id, extractedText, document.templateId);
    } catch (e) {
      clauseError = e instanceof Error ? e.message : "Clause extraction failed";
    }

    // Auto-run AI document analysis so findings are ready immediately.
    if (clauses.length > 0) {
      try {
        await runDocumentAnalysis(document.id, typeof uploadedById === "string" ? uploadedById : null);
      } catch {
        // Analysis is best-effort — don't fail the upload if it errors.
      }
    }

    // Auto-approve if all clauses match the standard template exactly
    const typedClauses = clauses as { status?: string }[];
    const allStandard = typedClauses.length > 0 && typedClauses.every((c) => c.status === "STANDARD");
    if (allStandard) {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "APPROVED", riskLevel: "LOW" },
      });
    }

    // Reload so the response reflects any status change to UNDER_REVIEW.
    const updated = await prisma.document.findUnique({ where: { id: document.id } });

    const body: Record<string, unknown> = { document: updated ?? document, clauses };
    if (clauseError) body.extractionError = clauseError;
    else if (clauses.length === 0) body.extractionError = "No clauses were extracted from the document";

    return jsonOk(body, 201);
  } catch (error) {
    return serverError(error);
  }
}
