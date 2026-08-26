import type { TicketStatus } from "../types";

const STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200/80",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  CLOSED: "bg-slate-100/90 text-slate-600 border-slate-200",
};

const DOTS: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500",
  IN_PROGRESS: "bg-indigo-500",
  RESOLVED: "bg-emerald-500",
  CLOSED: "bg-slate-400",
};

const LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight shadow-sm ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status]}`} />
      {LABELS[status]}
    </span>
  );
}
