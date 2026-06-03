"use client";

// Inline-editable title — click to edit, blur/save to persist.
// Used for document company name so users can fix AI-detected names.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "./Toast";

export function EditableTitle({
  documentId,
  initialTitle,
}: {
  documentId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function save() {
    if (value.trim() === initialTitle.trim()) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setToast({ type: "success", message: "Name updated" });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <>
        <h1
          className="text-2xl font-semibold text-text-primary cursor-pointer hover:underline decoration-dotted underline-offset-4"
          onClick={() => setEditing(true)}
          title="Click to edit company name"
        >
          {initialTitle}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="ml-1.5 inline h-3.5 w-3.5 text-text-muted opacity-40">
            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"/>
          </svg>
        </h1>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          className="w-72 rounded-md border-2 bg-surface-raised px-2.5 py-1 text-2xl font-semibold text-text-primary focus:outline-none"
          style={{ borderColor: "var(--accent)" }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(initialTitle); setEditing(false); } }}
          onBlur={save}
          autoFocus
          disabled={saving}
        />
        {saving ? <span className="text-xs text-text-muted">Saving…</span> : null}
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
