import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Sidebar } from "../components/Sidebar";
import { HeaderNav } from "../components/HeaderNav";
import { DashboardCards } from "../components/DashboardCards";
import { FilterBar, type Filters, type SortKey } from "../components/FilterBar";
import { TicketTable } from "../components/TicketTable";
import { CreateTicketModal } from "../components/CreateTicketModal";
import { AGENTS, CREATE_TICKET, DASHBOARD, TICKETS } from "../graphql/operations";
import type { Priority, SLAState, Ticket, TicketConnection, TicketDashboard, TicketStatus, User } from "../types";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 10;

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function sortTickets(tickets: Ticket[], sort: SortKey): Ticket[] {
  return [...tickets].sort((a, b) => {
    switch (sort) {
      case "createdAt_asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "createdAt_desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "priority_desc":
        return (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      case "priority_asc":
        return (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0);
    }
  });
}

export function DashboardPage() {
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortKey>("createdAt_desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const pageIndex = cursorStack.length - 1;

  const { data: dashboardData, loading: dashboardLoading } = useQuery<{
    dashboard: TicketDashboard;
  }>(DASHBOARD, { pollInterval: 30_000 });

  const { data: agentsData } = useQuery<{ users: User[] }>(AGENTS);

  const { data: ticketsData, loading: ticketsLoading } = useQuery<{
    tickets: TicketConnection;
  }>(TICKETS, {
    variables: { ...filters, take: PAGE_SIZE, cursor: cursorStack[pageIndex] },
    fetchPolicy: "cache-and-network",
  });

  const [createTicket] = useMutation<{ createTicket: Ticket }>(CREATE_TICKET, {
    refetchQueries: [{ query: TICKETS, variables: { take: PAGE_SIZE } }, { query: DASHBOARD }],
    awaitRefetchQueries: true,
  });

  const sortedTickets = useMemo(
    () => sortTickets(ticketsData?.tickets.nodes ?? [], sort),
    [ticketsData, sort]
  );

  const handleFilterChange = (next: Filters) => {
    setFilters(next);
    setCursorStack([undefined]);
  };

  const handleCardClick = (cardFilter: { status?: TicketStatus; slaState?: SLAState }) => {
    if (cardFilter.slaState && filters.slaState === cardFilter.slaState) {
      handleFilterChange({ ...filters, slaState: undefined });
    } else if (cardFilter.status && filters.status === cardFilter.status && !filters.slaState) {
      handleFilterChange({ ...filters, status: undefined });
    } else {
      handleFilterChange({
        ...filters,
        status: cardFilter.status,
        slaState: cardFilter.slaState,
      });
    }
  };

  const handleNextPage = () => {
    const endCursor = ticketsData?.tickets.pageInfo.endCursor;
    if (endCursor) setCursorStack((stack) => [...stack, endCursor]);
  };

  const handlePrevPage = () => {
    setCursorStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  };

  const breachedCount = dashboardData?.dashboard.breachedTickets ?? 0;
  const atRiskCount = dashboardData?.dashboard.atRiskTickets ?? 0;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] antialiased text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 flex-1 pb-16">
        {/* Top Header Bar */}
        <HeaderNav />

        <main className="mx-auto max-w-7xl space-y-6 px-8 pt-4">
          {/* Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Support Overview
              </h1>
              <p className="mt-0.5 text-xs text-slate-400 font-medium">
                Live queue monitoring with business-hour SLA countdowns
              </p>
            </div>

            {currentUser?.role === "REPORTER" && (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Ticket</span>
              </button>
            )}
          </div>

          {/* SLA Breach Alert Banner */}
          {breachedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-xs text-rose-900 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-600 font-bold text-white shadow-xs">
                  !
                </span>
                <div>
                  <span className="font-semibold text-rose-950">
                    {breachedCount} {breachedCount === 1 ? "Ticket has" : "Tickets have"} breached SLA
                  </span>
                  <p className="text-[11px] text-rose-700">
                    Response or resolution target exceeded during business operating hours.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleFilterChange({ ...filters, slaState: "BREACHED" })}
                className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 shadow-2xs transition hover:bg-rose-50"
              >
                Filter Breached Tickets →
              </button>
            </div>
          )}

          {/* SLA At-Risk Alert Banner */}
          {breachedCount === 0 && atRiskCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 font-bold text-white shadow-xs">
                  ⚠
                </span>
                <div>
                  <span className="font-semibold text-amber-950">
                    {atRiskCount} {atRiskCount === 1 ? "Ticket is" : "Tickets are"} at risk
                  </span>
                  <p className="text-[11px] text-amber-700">
                    Over 75% of business-hour SLA budget consumed without first response or resolution.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleFilterChange({ ...filters, slaState: "AT_RISK" })}
                className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs transition hover:bg-amber-50"
              >
                Filter At-Risk Tickets →
              </button>
            </div>
          )}

          {/* Dashboard Metric Cards */}
          {dashboardLoading && !dashboardData ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-8">
              <span className="text-xs font-medium text-slate-400">Loading summary statistics…</span>
            </div>
          ) : dashboardData ? (
            <DashboardCards
              data={dashboardData.dashboard}
              activeFilter={{ status: filters.status, slaState: filters.slaState }}
              onCardClick={handleCardClick}
            />
          ) : null}

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            sort={sort}
            agents={agentsData?.users ?? []}
            onChange={handleFilterChange}
            onSortChange={setSort}
          />

          {/* Tickets Table */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
            <TicketTable tickets={sortedTickets} />
          </div>

          {/* Pagination Controls */}
          {ticketsData?.tickets.pageInfo && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrevPage}
                disabled={pageIndex === 0}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-xs font-medium text-slate-400">
                Page {pageIndex + 1}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!ticketsData.tickets.pageInfo.hasNextPage}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      <CreateTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={async (input) => {
          await createTicket({ variables: { input } });
        }}
      />
    </div>
  );
}
