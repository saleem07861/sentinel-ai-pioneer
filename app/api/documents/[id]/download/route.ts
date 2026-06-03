// GET /api/documents/[id]/download — download the approved/rebuilt document as text.
// Returns the approvedContent if available, otherwise assembles from current clauses.

import { prisma } from "@/lib/prisma";
import { notFound, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: params.id, isActive: true },
      select: {
        id: true,
        title: true,
        approvedContent: true,
        status: true,
        clauses: { orderBy: { orderIndex: "asc" }, select: { title: true, content: true, editedContent: true, reviewStatus: true } },
      },
    });

    if (!doc) return notFound(`Document ${params.id} not found`);

    // Use pre-built approvedContent if available, otherwise assemble from clauses
    let content: string;
    if (doc.approvedContent) {
      content = doc.approvedContent;
    } else {
      content = doc.clauses
        .map((c) => {
          const text = c.editedContent ?? c.content;
          return `${c.title.toUpperCase()}\n\n${text}`;
        })
        .join("\n\n---\n\n");
    }

    const safeFilename = doc.title.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename}.txt"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
