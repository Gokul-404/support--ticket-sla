import { useState, type FormEvent } from "react";
import type { Comment } from "../types";
import { formatDateTime } from "../utils/format";

interface Props {
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  submitting?: boolean;
}

export function CommentTimeline({ comments, onAddComment, submitting }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    try {
      await onAddComment(content.trim());
      setContent("");
      setIsFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment.");
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarBg = (role: string, index: number) => {
    if (role === "AGENT") return "bg-blue-600 text-white";
    if (index % 2 === 1) return "bg-amber-500 text-white";
    return "bg-purple-600 text-white";
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-sm font-bold tracking-tight text-slate-900">
          Discussion &amp; History ({comments.length})
        </h2>
        <button
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          {isFormOpen ? "Cancel" : "+ Add Note"}
        </button>
      </div>

      {/* Expandable Form if opened from "+ Add Note" */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 transition">
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 shadow-2xs transition focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            rows={3}
            placeholder="Write your update or response to the customer…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </form>
      )}

      {comments.length === 0 ? (
        <div className="py-10 text-center text-xs font-medium text-slate-400">
          No comments or updates yet.
        </div>
      ) : (
        <div className="relative mt-6 space-y-6 before:absolute before:bottom-3 before:left-3.5 before:top-3 before:w-0.5 before:bg-slate-100">
          {comments.map((comment, index) => (
            <div key={comment.id} className="relative flex items-start gap-4">
              {/* Initials Avatar */}
              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-xs ${getAvatarBg(
                  comment.author.role,
                  index
                )}`}
              >
                {getInitials(comment.author.name)}
              </div>

              {/* Comment Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {comment.author.name}
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 capitalize">
                      {comment.author.role === "AGENT" ? "Agent" : "Reporter"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatDateTime(comment.createdAt)}
                    </span>
                    <button className="text-slate-400 hover:text-slate-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
