import type { TicketStatus } from "../types";

const NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

interface Props {
  currentStatus: TicketStatus;
  disabled?: boolean;
  onChange: (status: TicketStatus) => void;
}

export function StatusDropdown({ currentStatus, disabled, onChange }: Props) {
  const options = NEXT_STATUSES[currentStatus];

  if (options.length === 0) {
    return <span className="text-xs font-medium text-slate-400">Terminal status</span>;
  }

  return (
    <select
      className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-50"
      value=""
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value as TicketStatus);
      }}
    >
      <option value="" disabled>
        Change status…
      </option>
      {options.map((status) => (
        <option key={status} value={status}>
          → {LABELS[status]}
        </option>
      ))}
    </select>
  );
}
