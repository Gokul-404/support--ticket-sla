import type { SLAState } from "../types";

const STYLES: Record<SLAState, string> = {
  ON_TRACK: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  AT_RISK: "bg-amber-50 text-amber-800 border-amber-200/80",
  BREACHED: "bg-rose-50 text-rose-700 border-rose-200/80",
};

const DOT_COLORS: Record<SLAState, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  BREACHED: "bg-rose-500",
};

const LABELS: Record<SLAState, string> = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  BREACHED: "Breached",
};

export function SLABadge({ state }: { state: SLAState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight shadow-sm ${STYLES[state]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[state]}`} />
      {LABELS[state]}
    </span>
  );
}
