"use client";

// Template management — list approved source documents, view clause counts,
// upload new templates, delete templates + all their clauses.

import { useState, useEffect, useCallback } from "react";
import { Toast, type ToastState } from "./Toast";

interface Template {
  name: string;
  clauseCount: number;
}

export function KnowledgeTemplatesClient({ organisationId }: { organisationId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge-base/templates?organisationId=${organisationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setTemplates(data.templates);
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoading(false);
    }
  }, [organisationId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("organisationId", organisationId);
      form.append("documentName", file.name.replace(/\.[^.]+$/, ""));
      const res = await fetch("/api/knowledge-base/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      setToast({ type: "success", message: `Imported ${data.imported} clauses` });
      fetchTemplates();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function deleteTemplate(name: string) {
    if (!confirm(`Delete template "${name}" and all ${templates.find(t => t.name === name)?.clauseCount} clauses?`)) return;
    try {
      const qs = new URLSearchParams({ organisationId, sourceDocument: name });
      const res = await fetch(`/api/knowledge-base/templates?${qs.toString()}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setToast({ type: "success", message: `Deleted "${name}" (${data.deleted} clauses removed)` });
      fetchTemplates();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className={`cursor-pointer rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? "Uploading…" : "Upload Template"}
          <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <span className="text-xs text-text-muted">{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-raised p-10 text-center text-sm text-text-muted">
          No approved templates yet. Upload a standard contract above to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Clauses</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.name} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-text-primary">{t.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.clauseCount} clause{t.clauseCount !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteTemplate(t.name)} className="rounded p-1 text-text-muted hover:bg-surface hover:text-danger" title="Delete template and all clauses">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
