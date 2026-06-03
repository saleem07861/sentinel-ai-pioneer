// Audit action badge.
// CREATED=green, UPDATED=blue, AI_ANALYSED=orange, APPROVED=green,
// REJECTED=red, REVIEWED=blue, DELETED=red, EXPORTED=grey.

import { Badge, type Tone } from "./Badge";

const ACTION_TONE: Record<string, Tone> = {
  CREATED: "green",
  UPDATED: "blue",
  AI_ANALYSED: "orange",
  APPROVED: "green",
  REJECTED: "red",
  REVIEWED: "blue",
  DELETED: "red",
  EXPORTED: "grey",
};

export function ActionBadge({ action }: { action: string }) {
  const tone = ACTION_TONE[action] ?? "grey";
  return <Badge tone={tone}>{action.replace(/_/g, " ")}</Badge>;
}
