// Decision outcome badge.
// ACCEPTED=green, REJECTED=red, NEGOTIATED=blue, ESCALATED=amber, DEFERRED=grey.

import { Badge, type Tone } from "./Badge";

const OUTCOME_TONE: Record<string, Tone> = {
  ACCEPTED: "green",
  REJECTED: "red",
  NEGOTIATED: "blue",
  ESCALATED: "amber",
  DEFERRED: "grey",
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const tone = OUTCOME_TONE[outcome] ?? "grey";
  return <Badge tone={tone}>{outcome}</Badge>;
}
