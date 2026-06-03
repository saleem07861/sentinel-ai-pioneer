"use client";

// Status + risk filters that drive the documents table via URL search params.

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["UPLOADED", "UNDER_REVIEW", "REVIEWED", "APPROVED", "REJECTED", "ARCHIVED"];
const RISKS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function DocumentFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/documents${next.toString() ? `?${next.toString()}` : ""}`);
  }

  const fieldCls =
    "rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary focus:border-border-strong focus:outline-none";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <select className={fieldCls} value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
        ))}
      </select>
      <select className={fieldCls} value={params.get("riskLevel") ?? ""} onChange={(e) => setParam("riskLevel", e.target.value)}>
        <option value="">All risk levels</option>
        {RISKS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {(params.get("status") || params.get("riskLevel")) && (
        <button onClick={() => router.push("/documents")} className="text-sm text-text-muted underline-offset-2 hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}
