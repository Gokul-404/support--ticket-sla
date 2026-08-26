import { useState, type FormEvent } from "react";
import type { Priority } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; description: string; priority: Priority }) => Promise<void>;
}

export function CreateTicketModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    try {
      await onCreate({ title: title.trim(), description: description.trim(), priority });
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Create Support Ticket
              </h2>
              <p className="text-[11px] text-slate-500">Submit an issue for business-hours SLA tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-600">
              Ticket Title
            </label>
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder="e.g. Production payment webhook failures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-600">
              Issue Description
            </label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              rows={4}
              placeholder="Provide specific details, repro steps, or error codes…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-600">
              Priority &amp; SLA Commitment
            </label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="LOW">Low — 24h Response / 72h Resolution</option>
              <option value="MEDIUM">Medium — 8h Response / 48h Resolution</option>
              <option value="HIGH">High — 4h Response / 24h Resolution</option>
              <option value="URGENT">Urgent — 1h Response / 4h Resolution</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200/90 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
