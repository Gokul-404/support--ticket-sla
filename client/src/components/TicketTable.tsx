import { useNavigate } from "react-router-dom";
import type { Ticket } from "../types";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { SLATimer } from "./SLATimer";
import { formatDateTime } from "../utils/format";

export function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-md">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-800">No tickets match current filters</p>
        <p className="mt-1 text-xs text-slate-500">Try adjusting or clearing your filters to view more tickets.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-xs backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Ticket &amp; Reporter</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Assignee</th>
              <th className="px-3 py-3">First Response SLA</th>
              <th className="px-3 py-3">Resolution SLA</th>
              <th className="px-4 py-3 text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="group cursor-pointer transition-colors duration-150 hover:bg-slate-50/80"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                      {ticket.title}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500">
                      by <span className="font-medium text-slate-700">{ticket.reporter.name}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {ticket.assignee ? (
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">
                        {ticket.assignee.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <SLATimer
                    dueAt={ticket.sla.firstResponseDueAt}
                    completedAt={ticket.firstResponseAt}
                    state={ticket.sla.firstResponseState}
                    remainingMinutes={ticket.sla.firstResponseRemainingMinutes}
                    kind="first-response"
                    compact
                  />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <SLATimer
                    dueAt={ticket.sla.resolutionDueAt}
                    completedAt={ticket.resolvedAt}
                    state={ticket.sla.resolutionState}
                    remainingMinutes={ticket.sla.resolutionRemainingMinutes}
                    kind="resolution"
                    compact
                  />
                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {formatDateTime(ticket.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
