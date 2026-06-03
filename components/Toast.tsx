"use client";

// Minimal transient toast (bottom-right), auto-dismisses after 4s.

import { useEffect } from "react";

export type ToastState = { message: string; type: "success" | "error" } | null;

export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const color = toast.type === "success" ? "var(--success)" : "var(--danger)";
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div
        className="flex items-start gap-2 rounded-md border bg-surface-raised px-4 py-3 text-sm shadow-lg"
        style={{ borderLeftColor: color, borderLeftWidth: 3, borderColor: "var(--border)" }}
      >
        <span style={{ color }} className="font-semibold">
          {toast.type === "success" ? "✓" : "✕"}
        </span>
        <span className="text-text-primary">{toast.message}</span>
      </div>
    </div>
  );
}
