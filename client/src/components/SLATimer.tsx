import { useLiveTimer } from "../hooks/useLiveTimer";
import type { SLAState } from "../types";
import { formatSeconds } from "../utils/format";

const STATE_COLOR: Record<SLAState, string> = {
  ON_TRACK: "text-emerald-800 border-emerald-200/90 bg-emerald-50/70",
  AT_RISK: "text-amber-900 border-amber-200/90 bg-amber-50/70",
  BREACHED: "text-rose-800 border-rose-200/90 bg-rose-50/70",
};

const STATE_DOT: Record<SLAState, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  BREACHED: "bg-rose-500",
};

interface Props {
  dueAt: string;
  completedAt?: string | null;
  state: SLAState;
  kind: "first-response" | "resolution";
  remainingMinutes?: number;
  compact?: boolean;
}

export function SLATimer({
  dueAt,
  completedAt,
  state,
  kind,
  remainingMinutes,
  compact = false,
}: Props) {
  const { remainingSeconds, frozen, isPaused } = useLiveTimer(dueAt, completedAt, remainingMinutes);
  const overdue = remainingSeconds < 0;
  const timeStr = formatSeconds(remainingSeconds);

  if (frozen) {
    const verb = kind === "first-response" ? "Responded" : "Resolved";
    const met = !overdue;

    if (compact) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight shadow-sm ${
            met
              ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
              : "border-rose-200/80 bg-rose-50 text-rose-700"
          }`}
        >
          {met ? (
            <svg className="h-3 w-3 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-3 w-3 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          <span>{verb}</span>
          {overdue && <span className="text-[10px] text-rose-600">({timeStr} late)</span>}
        </span>
      );
    }

    return (
      <div
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-sm ${
          met
            ? "border-emerald-200/90 bg-emerald-50 text-emerald-800"
            : "border-rose-200/90 bg-rose-50 text-rose-800"
        }`}
      >
        {met ? (
          <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
        <span>
          {verb} — SLA {met ? "Met on time" : "Breached"}
          {overdue && <span className="ml-1 text-rose-600 font-normal">({timeStr} late)</span>}
          {met && <span className="ml-1 text-emerald-700 font-normal">({timeStr} ahead)</span>}
        </span>
      </div>
    );
  }

  const effectiveState: SLAState = overdue ? "BREACHED" : state;
  const colorClass = STATE_COLOR[effectiveState];
  const dotClass = STATE_DOT[effectiveState];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums shadow-sm ${colorClass}`}
        title={isPaused ? "SLA clock paused outside business hours (Mon-Fri 09:00-18:00)" : "Active business SLA countdown"}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isPaused ? "bg-slate-400" : "animate-pulse " + dotClass}`} />
        {overdue ? `${timeStr} over` : timeStr}
        {isPaused && <span className="text-[10px] font-sans font-normal text-slate-500">(Paused)</span>}
      </span>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${colorClass}`}>
      <div className="flex items-center gap-2.5">
        <span className={`inline-block h-2 w-2 rounded-full ${isPaused ? "bg-slate-400" : "animate-pulse " + dotClass}`} />
        <span className="font-mono text-lg font-bold tabular-nums tracking-tight text-slate-900">
          {timeStr}
        </span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {overdue ? "Overdue" : isPaused ? "Paused (Off-Hours)" : "Biz Time Remaining"}
      </span>
    </div>
  );
}
