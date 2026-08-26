import type { Ticket } from "../types";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { SLABadge } from "./SLABadge";
import { SLATimer } from "./SLATimer";
import { formatDateTime } from "../utils/format";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-6">
      {/* Header & Meta Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {ticket.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Reported by</span>
              <span className="font-semibold text-slate-800">{ticket.reporter.name}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{formatDateTime(ticket.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* Description */}
        <div className="pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Description
          </h3>
          <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {ticket.description}
          </p>
        </div>
      </div>

      {/* Hero SLA Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* First Response SLA Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  First Response SLA
                </span>
              </div>
              <SLABadge state={ticket.sla.firstResponseState} />
            </div>

            <div className="py-4">
              <SLATimer
                dueAt={ticket.sla.firstResponseDueAt}
                completedAt={ticket.firstResponseAt}
                state={ticket.sla.firstResponseState}
                remainingMinutes={ticket.sla.firstResponseRemainingMinutes}
                kind="first-response"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">Due:</span>{" "}
            <span className="font-mono">{formatDateTime(ticket.sla.firstResponseDueAt)}</span>
          </div>
        </div>

        {/* Resolution SLA Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Resolution SLA
                </span>
              </div>
              <SLABadge state={ticket.sla.resolutionState} />
            </div>

            <div className="py-4">
              <SLATimer
                dueAt={ticket.sla.resolutionDueAt}
                completedAt={ticket.resolvedAt}
                state={ticket.sla.resolutionState}
                remainingMinutes={ticket.sla.resolutionRemainingMinutes}
                kind="resolution"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">Due:</span>{" "}
            <span className="font-mono">{formatDateTime(ticket.sla.resolutionDueAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
