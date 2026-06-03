// Risk level badge. LOW=green, MEDIUM=amber, HIGH=orange, CRITICAL=red.

import { Badge, type Tone } from "./Badge";

const RISK_TONE: Record<string, Tone> = {
  LOW: "green",
  MEDIUM: "amber",
  HIGH: "orange",
  CRITICAL: "red",
};

export function RiskBadge({ riskLevel }: { riskLevel?: string | null }) {
  if (!riskLevel) return <Badge tone="greyMuted">N/A</Badge>;
  const tone = RISK_TONE[riskLevel] ?? "grey";
  return <Badge tone={tone}>{riskLevel}</Badge>;
}
