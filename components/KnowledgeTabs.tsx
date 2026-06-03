"use client";

// Tabbed knowledge page: "Entries" (best practices), "Approved Clauses"
// (standard clause corpus), and "Templates" (source document management).

import { useState } from "react";
import { KnowledgeClient, type KnowledgeEntryView } from "./KnowledgeClient";
import { KnowledgeBaseClauseClient } from "./KnowledgeBaseClauseClient";
import { KnowledgeTemplatesClient } from "./KnowledgeTemplatesClient";

type Tab = "entries" | "clauses" | "templates";

export function KnowledgeTabs({
  organisationId,
  initialEntries,
}: {
  organisationId: string;
  initialEntries?: KnowledgeEntryView[];
}) {
  const [tab, setTab] = useState<Tab>("entries");

  const tabStyle = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "text-white"
        : "text-text-secondary hover:text-text-primary hover:bg-surface"
    }`;

  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-lg border border-border bg-surface-raised p-1 w-fit">
        <button onClick={() => setTab("entries")} className={tabStyle(tab === "entries")} style={tab === "entries" ? { backgroundColor: "var(--accent)" } : undefined}>Knowledge Entries</button>
        <button onClick={() => setTab("clauses")} className={tabStyle(tab === "clauses")} style={tab === "clauses" ? { backgroundColor: "var(--accent)" } : undefined}>Approved Clauses</button>
        <button onClick={() => setTab("templates")} className={tabStyle(tab === "templates")} style={tab === "templates" ? { backgroundColor: "var(--accent)" } : undefined}>Templates</button>
      </div>
      {tab === "entries" ? <KnowledgeClient organisationId={organisationId} initialEntries={initialEntries ?? []} />
      : tab === "clauses" ? <KnowledgeBaseClauseClient organisationId={organisationId} />
      : <KnowledgeTemplatesClient organisationId={organisationId} />}
    </div>
  );
}
