import type { SLAState, TicketDashboard, TicketStatus } from "../types";

interface Props {
  data: TicketDashboard;
  onCardClick?: (filter: { status?: TicketStatus; slaState?: SLAState }) => void;
  activeFilter?: { status?: TicketStatus; slaState?: SLAState };
}

export function DashboardCards({ data, onCardClick, activeFilter }: Props) {
  const cards = [
    {
      id: "open",
      title: "Open Tickets",
      value: data.openTickets,
      description: "Awaiting resolution",
      filter: { status: "OPEN" as TicketStatus },
      isActive: activeFilter?.status === "OPEN" && !activeFilter?.slaState,
      accentBorder: "border-l-blue-500",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      activeRing: "ring-2 ring-blue-500/80 border-blue-300 bg-blue-50/20",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: "in_progress",
      title: "In Progress",
      value: data.inProgressTickets,
      description: "Actively being worked",
      filter: { status: "IN_PROGRESS" as TicketStatus },
      isActive: activeFilter?.status === "IN_PROGRESS" && !activeFilter?.slaState,
      accentBorder: "border-l-indigo-500",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      activeRing: "ring-2 ring-indigo-500/80 border-indigo-300 bg-indigo-50/20",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "at_risk",
      title: "SLA At Risk",
      value: data.atRiskTickets,
      description: ">75% budget consumed",
      filter: { slaState: "AT_RISK" as SLAState },
      isActive: activeFilter?.slaState === "AT_RISK",
      accentBorder: "border-l-amber-500",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      activeRing: "ring-2 ring-amber-500/80 border-amber-300 bg-amber-50/20",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "breached",
      title: "SLA Breached",
      value: data.breachedTickets,
      description: "Deadline exceeded",
      filter: { slaState: "BREACHED" as SLAState },
      isActive: activeFilter?.slaState === "BREACHED",
      accentBorder: "border-l-rose-500",
      iconBg: "bg-rose-50 text-rose-600 border-rose-100",
      activeRing: "ring-2 ring-rose-500/80 border-rose-300 bg-rose-50/20",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onCardClick?.(c.filter)}
          className={`group relative flex flex-col justify-between rounded-xl border border-l-4 bg-white/80 p-4 text-left backdrop-blur-xl shadow-xs transition-all duration-180 hover:-translate-y-0.5 hover:shadow-md ${c.accentBorder} ${
            c.isActive ? c.activeRing : "border-slate-200/80 hover:border-slate-300 hover:bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {c.title}
            </span>
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${c.iconBg}`}>
              {c.icon}
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {c.value}
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500 font-normal">
                {c.description}
              </p>
            </div>
            <span className="text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Filter →
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
