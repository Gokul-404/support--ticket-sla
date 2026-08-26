import type { Priority, SLAState, TicketStatus, User } from "../types";

export interface Filters {
  status?: TicketStatus;
  priority?: Priority;
  assigneeId?: string;
  slaState?: SLAState;
}

export type SortKey = "createdAt_desc" | "createdAt_asc" | "priority_desc" | "priority_asc";

interface Props {
  filters: Filters;
  sort: SortKey;
  agents: User[];
  onChange: (filters: Filters) => void;
  onSortChange: (sort: SortKey) => void;
}

const selectClass =
  "rounded-lg border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

export function FilterBar({ filters, sort, agents, onChange, onSortChange }: Props) {
  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.slaState || filters.assigneeId
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur-xl shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 pr-1 text-xs font-semibold text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter:</span>
        </div>

        <select
          className={selectClass}
          value={filters.status ?? ""}
          onChange={(e) =>
            onChange({ ...filters, status: (e.target.value || undefined) as TicketStatus | undefined })
          }
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          className={selectClass}
          value={filters.priority ?? ""}
          onChange={(e) =>
            onChange({ ...filters, priority: (e.target.value || undefined) as Priority | undefined })
          }
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <select
          className={selectClass}
          value={filters.slaState ?? ""}
          onChange={(e) =>
            onChange({ ...filters, slaState: (e.target.value || undefined) as SLAState | undefined })
          }
        >
          <option value="">All SLA States</option>
          <option value="ON_TRACK">On Track</option>
          <option value="AT_RISK">At Risk</option>
          <option value="BREACHED">Breached</option>
        </select>

        {agents.length > 0 && (
          <select
            className={selectClass}
            value={filters.assigneeId ?? ""}
            onChange={(e) => onChange({ ...filters, assigneeId: e.target.value || undefined })}
          >
            <option value="">All Assignees</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
            onClick={() => onChange({})}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Sort:</span>
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
        >
          <option value="createdAt_desc">Newest first</option>
          <option value="createdAt_asc">Oldest first</option>
          <option value="priority_desc">Priority (High → Low)</option>
          <option value="priority_asc">Priority (Low → High)</option>
        </select>
      </div>
    </div>
  );
}
