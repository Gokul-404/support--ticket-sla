import { useState, type FormEvent } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { HeaderNav } from "../components/HeaderNav";
import { CREATE_TICKET } from "../graphql/operations";
import type { Priority, Ticket } from "../types";

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [createTicket, { loading }] = useMutation<{ createTicket: Ticket }>(CREATE_TICKET);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    try {
      const { data } = await createTicket({
        variables: { input: { title: title.trim(), description: description.trim(), priority } },
      });
      if (data?.createTicket) navigate(`/tickets/${data.createTicket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] antialiased text-slate-900 selection:bg-indigo-600 selection:text-white">
      <Sidebar />
      <div className="ml-64 flex-1 pb-16">
        <HeaderNav backLink={{ to: "/dashboard", label: "Back to Tickets" }} />
        <main className="mx-auto max-w-2xl px-8 pt-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xs">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Create Support Ticket
            </h1>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              Submit an issue with automatic business-hour SLA target calculation
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Title
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 shadow-2xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  placeholder="Brief summary of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 placeholder-slate-400 shadow-2xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  rows={5}
                  placeholder="Detailed description of the issue or question…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Priority
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="LOW">Low (72h SLA)</option>
                  <option value="MEDIUM">Medium (48h SLA)</option>
                  <option value="HIGH">High (24h SLA)</option>
                  <option value="URGENT">Urgent (4h SLA)</option>
                </select>
              </div>

              {error && (
                <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {error}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Creating…" : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
