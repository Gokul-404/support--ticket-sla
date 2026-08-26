import type { Priority } from "../types";

const STYLES: Record<Priority, string> = {
  LOW: "bg-slate-100/80 text-slate-700 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200/80",
  HIGH: "bg-amber-50 text-amber-800 border-amber-200/80",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200/80 font-bold",
};

const DOTS: Record<Priority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-rose-500",
};

const LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight shadow-sm ${STYLES[priority]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[priority]}`} />
      {LABELS[priority]}
    </span>
  );
}
