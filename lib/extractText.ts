// Server-side text extraction from uploaded contract files.
// PDF → pdf-parse (v2), .docx → mammoth, .txt → utf-8.

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type SupportedType = "pdf" | "docx" | "txt";

/** Detects a supported file type from its name, or null if unsupported. */
export function detectType(filename: string): SupportedType | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt"; // accepted for testing
  return null;
}

export async function extractText(buffer: Buffer, type: SupportedType): Promise<string> {
  if (type === "txt") {
    return buffer.toString("utf8");
  }

  if (type === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // pdf
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
