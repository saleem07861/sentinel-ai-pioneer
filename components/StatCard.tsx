// Dashboard stat card: label + value, with an optional accent tone for the value.

import type { ReactNode } from "react";

type Accent = "default" | "orange" | "red" | "green";

const VALUE_COLOR: Record<Accent, string> = {
  default: "var(--text-primary)",
  orange: "var(--accent)",
  red: "var(--danger)",
  green: "var(--success)",
};

export function StatCard({
  label,
  value,
  accent = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  accent?: Accent;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold" style={{ color: VALUE_COLOR[accent] }}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
    </div>
  );
}
