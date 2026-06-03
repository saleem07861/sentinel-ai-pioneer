"use client";

// "Upload Contract" button + modal. POSTs multipart to /api/documents/upload
// with two-phase progress messaging, then refreshes the document list.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "./Toast";

interface TemplateOption { id: string; name: string; }

export function UploadContract({
  organisationId,
  moduleId,
  uploadedById,
  templates,
}: {
  organisationId: string;
  moduleId: string;
  uploadedById: string | null;
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [toast, setToast] = useState<ToastState>(null);

  function reset() {
    setTitle(""); setTemplateId(""); setPhase("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setToast({ type: "error", message: "Choose a file to upload" });
      return;
    }
    if (!templateId) {
      setToast({ type: "error", message: "Select a template to compare against" });
      return;
    }

    setBusy(true);
    setPhase("Uploading document…");
    // After 1s still in-flight, switch messaging to the extraction phase.
    const timer = setTimeout(() => setPhase("Extracting clauses with AI…"), 1000);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("organisationId", organisationId);
      fd.append("moduleId", moduleId);
      if (uploadedById) fd.append("uploadedById", uploadedById);
      if (templateId) fd.append("templateId", templateId);
      if (title.trim()) fd.append("title", title.trim());

      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");

      const n = Array.isArray(data.clauses) ? data.clauses.length : 0;
      setToast({ type: "success", message: `Contract uploaded — ${n} clause${n === 1 ? "" : "s"} extracted` });
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      clearTimeout(timer);
      setBusy(false);
      setPhase("");
    }
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--accent)" }}
      >
        Upload Contract
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Upload contract</h2>
            <p className="mt-1 text-xs text-text-muted">PDF or .docx (.txt accepted for testing) · max 10MB</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">File</span>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className={fieldCls} disabled={busy} />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Company Name</span>
                <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave blank if unsure" disabled={busy} />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-secondary">Compare against template <span style={{color:"var(--danger)"}}>*</span></span>
                <select className={fieldCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={busy}>
                  <option value="">— Select a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {busy && phase ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
                {phase}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button onClick={submit} disabled={busy} className="rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "var(--accent)" }}>
                {busy ? "Working…" : "Upload"}
              </button>
              <button onClick={() => setOpen(false)} disabled={busy} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface disabled:opacity-60">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
