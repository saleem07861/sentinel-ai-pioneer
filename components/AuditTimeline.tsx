// Vertical workflow timeline. Each step is done (✓, orange) or pending (grey).

export interface TimelineStep {
  label: string;
  done: boolean;
}

export function AuditTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-4">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold"
                style={
                  step.done
                    ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }
                    : { backgroundColor: "var(--surface)", borderColor: "var(--border-strong)", color: "var(--text-muted)" }
                }
              >
                {step.done ? "✓" : i + 1}
              </span>
              {!isLast ? <span className="mt-1 w-px flex-1" style={{ backgroundColor: "var(--border)" }} /> : null}
            </div>
            <div className="pb-1">
              <div
                className="text-sm font-medium"
                style={{ color: step.done ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {step.label}
              </div>
              <div className="text-xs text-text-muted">{step.done ? "Complete" : "Pending"}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
