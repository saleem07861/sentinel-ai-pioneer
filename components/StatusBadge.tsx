// Document status badge.
// UPLOADED=grey, UNDER_REVIEW=blue, REVIEWED=green, APPROVED=green-strong,
// REJECTED=red, ARCHIVED=grey-muted.

import { Badge, type Tone } from "./Badge";

const STATUS_TONE: Record<string, Tone> = {
  UPLOADED: "grey",
  UNDER_REVIEW: "blue",
  REVIEWED: "green",
  APPROVED: "greenStrong",
  REJECTED: "red",
  ARCHIVED: "greyMuted",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "grey";
  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}
