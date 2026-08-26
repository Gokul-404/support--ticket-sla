import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { HeaderNav } from "../components/HeaderNav";
import { SLAGaugeCard } from "../components/SLAGaugeCard";
import { CommentTimeline } from "../components/CommentTimeline";
import { AGENTS, ADD_COMMENT, ASSIGN_TICKET, CHANGE_TICKET_STATUS, TICKET, RESOLVE_TICKET } from "../graphql/operations";
import type { Ticket, User, TicketStatus, Priority } from "../types";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/format";

export function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery<{ ticket: Ticket }>(TICKET, {
    variables: { id },
    skip: !id,
  });

  const { data: agentsData } = useQuery<{ users: User[] }>(AGENTS);

  const [assignTicket, { loading: assignLoading }] = useMutation(ASSIGN_TICKET, { onCompleted: () => refetch() });
  const [changeStatus, { loading: statusLoading }] = useMutation(CHANGE_TICKET_STATUS, { onCompleted: () => refetch() });
  const [resolveTicket, { loading: resolveLoading }] = useMutation(RESOLVE_TICKET, { onCompleted: () => refetch() });
  const [addComment, { loading: commentSubmitting }] = useMutation(ADD_COMMENT, { onCompleted: () => refetch() });

  const handleModalCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    try {
      if (id) {
        await addComment({ variables: { ticketId: id, content: commentText.trim() } });
        setCommentText("");
        setCommentModalOpen(false);
      }
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to add comment.");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="ml-64 flex-1 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="mt-3 text-xs font-medium text-slate-400">Loading ticket…</p>
        </div>
      </div>
    );
  }

  if (error || !data?.ticket) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="ml-64 flex-1 p-8">
          <HeaderNav backLink={{ to: "/dashboard", label: "Back to Tickets" }} />
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-xs">
            <h1 className="text-base font-bold text-slate-900">Ticket Not Found</h1>
            <p className="mt-2 text-xs text-slate-500">
              {error ? error.message : "The requested ticket does not exist or you do not have permission."}
            </p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ticket = data.ticket;
  const isAgent = currentUser?.role === "AGENT";

  // Priority badge styling
  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "HIGH":
        return "bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A]";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  // Status badge styling
  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case "RESOLVED":
        return "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-600 border border-slate-200";
      case "OPEN":
      default:
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
  };

  // Format ID
  const displayId = ticket.id.length > 14 ? `TKT-${ticket.id.slice(0, 10)}` : ticket.id;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] antialiased text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 flex-1 pb-16">
        {/* Top Header Bar */}
        <HeaderNav backLink={{ to: "/dashboard", label: "Back to Tickets" }} />

        <main className="mx-auto max-w-7xl px-8 pt-4">
          {/* Main Ticket Header Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left Title & Reporter Details */}
              <div className="flex items-center gap-4">
                {/* Purple Icon Container */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {ticket.title}
                  </h1>
                  <p className="mt-1 text-xs text-slate-400 font-medium">
                    Reported by <span className="font-semibold text-slate-800">{ticket.reporter.name}</span> • {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
              </div>

              {/* Right Action Controls & Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Priority Badge */}
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getPriorityStyle(ticket.priority)}`}>
                  {ticket.priority.toLowerCase()}
                </span>

                {/* Status Badge */}
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(ticket.status)}`}>
                  {ticket.status === "RESOLVED" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                  {ticket.status === "IN_PROGRESS" ? "In Progress" : ticket.status.toLowerCase()}
                </span>

                {/* Assignee Dropdown */}
                {isAgent ? (
                  <div className="relative">
                    <select
                      value={ticket.assignee?.id ?? ""}
                      disabled={assignLoading}
                      onChange={(e) => {
                        if (e.target.value) {
                          assignTicket({ variables: { ticketId: ticket.id, assigneeId: e.target.value } });
                        }
                      }}
                      className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="" disabled>
                        {ticket.assignee ? ticket.assignee.name : "Assign agent…"}
                      </option>
                      {agentsData?.users.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {ticket.assignee?.name ?? "Unassigned"}
                  </span>
                )}

                {/* Status Dropdown */}
                {isAgent && ticket.status !== "CLOSED" && (
                  <div className="relative">
                    <select
                      value=""
                      disabled={statusLoading}
                      onChange={(e) => {
                        if (e.target.value) {
                          if (e.target.value === "RESOLVED") {
                            resolveTicket({ variables: { ticketId: ticket.id } });
                          } else {
                            changeStatus({ variables: { ticketId: ticket.id, status: e.target.value as TicketStatus } });
                          }
                        }
                      }}
                      className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="" disabled>
                        Move status to…
                      </option>
                      {ticket.status === "OPEN" && <option value="IN_PROGRESS">→ In Progress</option>}
                      {ticket.status === "IN_PROGRESS" && <option value="RESOLVED">→ Resolved</option>}
                      {ticket.status === "RESOLVED" && <option value="CLOSED">→ Closed</option>}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {/* Add Comment Button */}
                <button
                  onClick={() => setCommentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98]"
                >
                  <span>Add comment</span>
                </button>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column (2 spans): Description, SLA Cards, Timeline */}
            <div className="space-y-6 lg:col-span-2">
              {/* Description Card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2>Description</h2>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>

              {/* SLA Cards Grid (First Response SLA & Resolution SLA) */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* First Response SLA Card */}
                <SLAGaugeCard
                  title="First Response SLA"
                  dueAt={ticket.sla.firstResponseDueAt}
                  completedAt={ticket.firstResponseAt}
                  createdAt={ticket.createdAt}
                  state={ticket.sla.firstResponseState}
                  kind="first-response"
                  remainingMinutes={ticket.sla.firstResponseRemainingMinutes}
                />

                {/* Resolution SLA Card */}
                <SLAGaugeCard
                  title="Resolution SLA"
                  dueAt={ticket.sla.resolutionDueAt}
                  completedAt={ticket.resolvedAt}
                  createdAt={ticket.createdAt}
                  state={ticket.sla.resolutionState}
                  kind="resolution"
                  remainingMinutes={ticket.sla.resolutionRemainingMinutes}
                />
              </div>

              {/* Discussion & History Timeline Card */}
              <CommentTimeline
                comments={ticket.comments}
                submitting={commentSubmitting}
                onAddComment={async (content) => {
                  await addComment({ variables: { ticketId: ticket.id, content } });
                }}
              />
            </div>

            {/* Right Column (1 span): Ticket Details Sidebar */}
            <div>
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  Ticket Details
                </h2>

                <div className="mt-5 space-y-4 text-xs">
                  {/* Ticket ID */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Ticket ID</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900 pl-5.5">{displayId}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" fill="currentColor" />
                      </svg>
                      <span>Status</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-bold text-slate-900 pl-5.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{ticket.status === "RESOLVED" ? "Resolved" : ticket.status === "IN_PROGRESS" ? "In Progress" : ticket.status}</span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      <span>Priority</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900 pl-5.5 capitalize">{ticket.priority.toLowerCase()}</p>
                  </div>

                  {/* Assignee */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Assignee</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900 pl-5.5">{ticket.assignee ? ticket.assignee.name : "Unassigned"}</p>
                  </div>

                  {/* Reporter */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Reporter</span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900 pl-5.5">{ticket.reporter.name}</p>
                  </div>

                  {/* Created At */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Created At</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800 pl-5.5">{formatDateTime(ticket.createdAt)}</p>
                  </div>

                  {/* Updated At */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Updated At</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800 pl-5.5">{formatDateTime(ticket.updatedAt)}</p>
                  </div>

                  {/* First Response At */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>First Response At</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800 pl-5.5">{formatDateTime(ticket.firstResponseAt)}</p>
                  </div>

                  {/* Resolved At */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Resolved At</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800 pl-5.5">{formatDateTime(ticket.resolvedAt)}</p>
                  </div>

                  {/* First Response SLA Due */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 14 14" />
                      </svg>
                      <span>First Response SLA Due</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800 pl-5.5">{formatDateTime(ticket.sla.firstResponseDueAt)}</p>
                  </div>

                  {/* Resolution SLA Due */}
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 14 14" />
                      </svg>
                      <span>Resolution SLA Due</span>
                    </div>
                    <p className="mt-1 font-medium text-slate-800 pl-5.5">{formatDateTime(ticket.sla.resolutionDueAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Comment Modal */}
      {commentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Comment to Ticket</h3>
              <button
                onClick={() => {
                  setCommentModalOpen(false);
                  setCommentError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalCommentSubmit} className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Comment message
              </label>
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your response or update…"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                autoFocus
              />
              {commentError && (
                <p className="mt-2 text-xs font-semibold text-rose-600">{commentError}</p>
              )}

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCommentModalOpen(false);
                    setCommentError(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commentSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {commentSubmitting ? "Posting…" : "Add Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
