import type { SLAState } from "../types";
import { useLiveTimer } from "../hooks/useLiveTimer";
import { formatDateTime, formatSeconds } from "../utils/format";

interface SLAGaugeCardProps {
  title: string;
  dueAt: string;
  completedAt?: string | null;
  createdAt: string;
  state: SLAState;
  kind: "first-response" | "resolution";
  remainingMinutes?: number;
}

export function SLAGaugeCard({
  title,
  dueAt,
  completedAt,
  createdAt,
  state,
  kind,
  remainingMinutes,
}: SLAGaugeCardProps) {
  const { remainingSeconds, frozen, isPaused } = useLiveTimer(dueAt, completedAt, remainingMinutes);
  const isOverdue = remainingSeconds < 0;

  // Calculate percentage
  const dueMs = new Date(dueAt).getTime();
  const createdMs = new Date(createdAt).getTime();
  const totalWindowSec = Math.max(1, (dueMs - createdMs) / 1000);

  let percent = 100;
  let statusText = "";
  let durationText = "";
  let spareText = "";

  if (frozen && completedAt) {
    const compMs = new Date(completedAt).getTime();
    const elapsedSec = Math.max(0, Math.round((compMs - createdMs) / 1000));
    durationText = formatSeconds(elapsedSec);

    if (!isOverdue) {
      percent = 100;
      statusText = kind === "first-response" ? "Responded — SLA met" : "Resolved — SLA met";
      const spareSec = Math.max(0, Math.round((dueMs - compMs) / 1000));
      spareText = `(${formatSeconds(spareSec)} spare)`;
    } else {
      percent = 0;
      statusText = kind === "first-response" ? "Responded — SLA Breached" : "Resolved — SLA Breached";
      const lateSec = Math.abs(remainingSeconds);
      spareText = `(${formatSeconds(lateSec)} late)`;
    }
  } else {
    // Active timer
    if (isOverdue) {
      percent = 0;
      statusText = kind === "first-response" ? "Response Overdue" : "Resolution Overdue";
      durationText = `${formatSeconds(Math.abs(remainingSeconds))} overdue`;
    } else {
      const consumedRatio = Math.max(0, Math.min(1, remainingSeconds / totalWindowSec));
      percent = Math.round(consumedRatio * 100);
      statusText = isPaused ? "Paused (Off-Hours)" : "In Progress";
      durationText = `${formatSeconds(remainingSeconds)} remaining`;
      spareText = isPaused ? "Business hours 09:00 - 18:00" : "";
    }
  }

  // SVG Gauge calculations
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const isGreen = !isOverdue && (state === "ON_TRACK" || percent > 50 || frozen);
  const isAmber = !isOverdue && state === "AT_RISK" && !frozen;
  const isRed = isOverdue || state === "BREACHED";

  const strokeColor = isRed ? "#EF4444" : isAmber ? "#F59E0B" : "#10B981";
  const badgeBg = isRed
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isAmber
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const badgeLabel = isRed ? "Breached" : isAmber ? "At risk" : "On track";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs transition hover:border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeBg}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Center Gauge & Text */}
      <div className="mt-5 flex items-center gap-5">
        {/* SVG Circular Gauge */}
        <div className="relative flex h-18 w-18 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
            {/* Background Track */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="5"
            />
            {/* Progress Stroke */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-extrabold text-slate-900">{percent}%</span>
          </div>
        </div>

        {/* Text Details */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            {frozen && !isOverdue && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className={isRed ? "text-rose-700" : isGreen ? "text-slate-900" : "text-amber-700"}>
              {statusText}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">
            {frozen ? (kind === "first-response" ? `Responded in ${durationText}` : `Resolved in ${durationText}`) : durationText}
          </p>
          {spareText && (
            <p className={`text-xs font-semibold ${isRed ? "text-rose-600" : "text-emerald-600"}`}>
              {spareText}
            </p>
          )}
        </div>
      </div>

      {/* Linear Progress Bar */}
      <div className="mt-5">
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isRed ? "bg-rose-500" : isAmber ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400">
        <span>Due: </span>
        <span className="font-semibold text-slate-600">{formatDateTime(dueAt)}</span>
      </div>
    </div>
  );
}
