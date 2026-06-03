"use client";

// Knowledge Base Clause management — browse, search by category, and remove
// clauses from the approved clause corpus. Upload is handled on the Templates tab.

import { useState, useEffect, useCallback } from "react";
import { Toast, type ToastState } from "./Toast";

interface KBClauseView {
  id: string;
  title: string;
  content: string;
  category: string;
  sourceDocument: string | null;
  tags: string[];
  createdAt: string;
}

export function KnowledgeBaseClauseClient({
  organisationId,
}: {
  organisationId: string;
}) {
  const [clauses, setClauses] = useState<KBClauseView[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [expandedClause, setExpandedClause] = useState<string | null>(null);

  const fetchData = useCallback(
    async (category?: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ organisationId });
        if (category) qs.set("category", category);
        const res = await fetch(
          `/api/knowledge-base/clauses?${qs.toString()}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load");
        setClauses(data.clauses);
        setCategories(data.categories);
        setCount(data.count);
      } catch (e) {
        setToast({
          type: "error",
          message: e instanceof Error ? e.message : "Failed to load",
        });
      } finally {
        setLoading(false);
      }
    },
    [organisationId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRemove(clauseId: string, title: string) {
    try {
      const qs = new URLSearchParams({ organisationId });
      const res = await fetch(
        `/api/knowledge-base/clauses/${clauseId}?${qs.toString()}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Remove failed");

      setToast({ type: "success", message: `Removed "${title}"` });
      fetchData(selectedCategory || undefined);
    } catch (e) {
      setToast({
        type: "error",
        message: e instanceof Error ? e.message : "Remove failed",
      });
    }
  }

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
    fetchData(cat || undefined);
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";

  const CATEGORY_COLORS: Record<string, string> = {
    "Governing Law": "var(--danger)",
    "Liability": "var(--accent)",
    "Indemnity": "var(--accent)",
    "Confidentiality": "var(--accent-amber)",
    "Data Protection": "var(--accent)",
    "IP Ownership": "var(--accent)",
    "Termination": "var(--accent-amber)",
    "Payment Terms": "var(--accent-amber)",
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className={`${fieldCls} max-w-[200px]`}
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">All categories ({count})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-text-muted">
          {count} approved clause{count !== 1 ? "s" : ""} in knowledge base
        </span>
      </div>

      {/* Clause list */}
      {loading ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-raised p-10 text-center text-sm text-text-muted">
          Loading knowledge base…
        </div>
      ) : clauses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-raised p-10 text-center">
          <p className="text-sm text-text-muted">
            {selectedCategory
              ? "No approved clauses in this category."
              : "No approved clauses yet."}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Upload a standard contract from the Templates tab to populate the knowledge base.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clauses.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border bg-surface-raised p-3 shadow-sm transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() =>
                    setExpandedClause(
                      expandedClause === c.id ? null : c.id,
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[c.category] ?? "var(--text-muted)",
                      }}
                    >
                      {c.category}
                    </span>
                    <h3 className="truncate text-sm font-semibold text-text-primary">
                      {c.title}
                    </h3>
                  </div>
                  {c.sourceDocument && (
                    <p className="mt-1 text-xs text-text-muted">
                      Source: {c.sourceDocument}
                    </p>
                  )}
                  {c.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-text-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {expandedClause === c.id && (
                    <pre className="mt-2 whitespace-pre-wrap rounded border border-border bg-surface p-2 text-xs text-text-secondary leading-relaxed">
                      {c.content}
                    </pre>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(c.id, c.title)}
                  className="shrink-0 rounded p-1 text-text-muted hover:bg-surface hover:text-danger"
                  title="Remove from knowledge base"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-4 w-4"
                  >
                    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
