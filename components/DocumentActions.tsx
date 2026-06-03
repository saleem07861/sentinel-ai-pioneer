"use client";

// Inline download link + archive button rendered in the documents table actions column.

import { useRouter } from "next/navigation";

interface Props {
  documentId: string;
  documentTitle: string;
  status: string;
  canDownload: boolean;
}

export function DocumentActions({ documentId, documentTitle, status, canDownload }: Props) {
  const router = useRouter();

  async function handleArchive() {
    if (!confirm(`Archive "${documentTitle}"? It will be hidden from active views.`)) return;

    const res = await fetch(`/api/documents/${documentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      alert(err.error ?? "Failed to archive document");
    }
  }

  const isArchived = status === "ARCHIVED";

  return (
    <div className="flex items-center justify-end gap-2">
      {canDownload ? (
        <a
          href={`/api/documents/${documentId}/download`}
          download
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "var(--success)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download
        </a>
      ) : null}
      {!isArchived ? (
        <button
          onClick={handleArchive}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-surface hover:text-text-secondary"
          title="Archive this document"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
          </svg>
          Archive
        </button>
      ) : null}
    </div>
  );
}
