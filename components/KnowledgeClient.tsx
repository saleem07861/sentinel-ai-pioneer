"use client";

// Knowledge page body: tag search + card grid + "Add Entry" modal.
// All data flows through /api/knowledge (client-side interactions).

import { useState } from "react";
import { Toast, type ToastState } from "./Toast";

export interface KnowledgeEntryView {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  sourceDecisionId: string | null;
}

export function KnowledgeClient({
  organisationId,
  initialEntries,
}: {
  organisationId: string;
  initialEntries: KnowledgeEntryView[];
}) {
  const [entries, setEntries] = useState<KnowledgeEntryView[]>(initialEntries);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // add form
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const tagList = query.split(",").map((t) => t.trim()).filter(Boolean);
      const qs = new URLSearchParams({ organisationId });
      if (tagList.length) qs.set("tags", tagList.join(","));
      const res = await fetch(`/api/knowledge?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Search failed");
      setEntries(data.entries);
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Search failed" });
    } finally {
      setLoading(false);
    }
  }

  async function addEntry() {
    setSubmitting(true);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId, title, summary, tags: tagList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to add entry");
      setEntries((prev) => [{ id: data.id, title: data.title, summary: data.summary, tags: data.tags ?? [], sourceDecisionId: data.sourceDecisionId ?? null }, ...prev]);
      setToast({ type: "success", message: "Knowledge entry added" });
      setModalOpen(false);
      setTitle(""); setSummary(""); setTags("");
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed to add entry" });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className={`${fieldCls} max-w-xs`}
          placeholder="Filter by tags (comma-separated)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button onClick={search} disabled={loading} className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface disabled:opacity-60">
          {loading ? "Searching…" : "Search"}
        </button>
        <button onClick={() => setModalOpen(true)} className="ml-auto rounded-md px-3 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: "var(--accent)" }}>
          Add Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-raised p-10 text-center text-sm text-text-muted">
          No knowledge entries{query ? " match those tags" : " yet"}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <div key={e.id} className="flex flex-col rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-text-primary">{e.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{e.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.tags.map((t) => (
                  <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">{t}</span>
                ))}
              </div>
              {e.sourceDecisionId ? (
                <div className="mt-3 text-xs text-text-muted">Source decision: <span className="font-mono">{e.sourceDecisionId.slice(0, 10)}…</span></div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Add knowledge entry</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Title</span>
                <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Summary</span>
                <textarea className={`${fieldCls} min-h-[80px]`} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Tags (comma-separated)</span>
                <input className={fieldCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="liability, ip, saas" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={addEntry} disabled={submitting || !title || !summary} className="rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "var(--accent)" }}>
                {submitting ? "Saving…" : "Save entry"}
              </button>
              <button onClick={() => setModalOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
