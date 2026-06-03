"use client";

// Re-run Review button — rarely needed since review runs automatically on upload.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "./Toast";

export function RunAnalysisButton({
  documentId,
  actorId,
}: {
  documentId: string;
  actorId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/analysis/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, actorId: actorId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analysis failed");
      setToast({ type: "success", message: "Review complete" });
      router.refresh();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Analysis failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Reviewing…
          </>
        ) : (
          "Re-run Review"
        )}
      </button>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
