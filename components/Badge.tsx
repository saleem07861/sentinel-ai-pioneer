// Base badge with a fixed tone palette. Colours are inline so they map exactly
// to the design tokens regardless of Tailwind opacity support for CSS vars.

import type { CSSProperties, ReactNode } from "react";

export type Tone =
  | "green"
  | "greenStrong"
  | "amber"
  | "orange"
  | "red"
  | "blue"
  | "grey"
  | "greyMuted";

const TONES: Record<Tone, { fg: string; bg: string; border: string }> = {
  green: { fg: "#16A34A", bg: "#E7F6EC", border: "#C2E9CF" },
  greenStrong: { fg: "#15803D", bg: "#DCFCE7", border: "#A7E3BC" },
  amber: { fg: "#B45309", bg: "#FEF3E2", border: "#F6D9A8" },
  orange: { fg: "#C2410C", bg: "#FFF1EB", border: "#FFD2BF" },
  red: { fg: "#DC2626", bg: "#FBE9E9", border: "#F3C6C6" },
  blue: { fg: "#2563EB", bg: "#E8F0FE", border: "#C7DBFB" },
  grey: { fg: "#52606D", bg: "#EEF1F5", border: "#D9DEE7" },
  greyMuted: { fg: "#7B8794", bg: "#F2F4F7", border: "#E2E7EE" },
};

export function Badge({
  tone,
  children,
  uppercase = true,
}: {
  tone: Tone;
  children: ReactNode;
  uppercase?: boolean;
}) {
  const t = TONES[tone];
  const style: CSSProperties = {
    color: t.fg,
    backgroundColor: t.bg,
    borderColor: t.border,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold leading-5 tracking-wide ${
        uppercase ? "uppercase" : ""
      }`}
      style={style}
    >
      {children}
    </span>
  );
}
