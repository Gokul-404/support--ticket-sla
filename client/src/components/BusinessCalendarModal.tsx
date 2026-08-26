import { useQuery } from "@apollo/client";
import { HOLIDAYS } from "../graphql/operations";
import type { Holiday } from "../types";
import { formatDateTime } from "../utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BusinessCalendarModal({ open, onClose }: Props) {
  const { data, loading } = useQuery<{ holidays: Holiday[] }>(HOLIDAYS, { skip: !open });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Business Hours &amp; Holiday Calendar
              </h2>
              <p className="text-[11px] text-slate-500">Configured operational schedule &amp; SLA commitments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5 text-xs">
          {/* Operating Schedule */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Working Days</span>
              <p className="mt-1 text-xs font-bold text-slate-800">Monday – Friday</p>
              <span className="text-[10px] text-slate-500">Weekends Paused</span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Business Hours</span>
              <p className="mt-1 text-xs font-bold text-slate-800">09:00 AM – 06:00 PM</p>
              <span className="text-[10px] text-slate-500">9 Hours / Day</span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Timezone</span>
              <p className="mt-1 font-mono text-xs font-bold text-slate-900">Asia/Kolkata</p>
              <span className="text-[10px] text-slate-500">UTC+05:30</span>
            </div>
          </div>

          {/* Priority SLA Matrix */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              SLA Commitments by Priority
            </h3>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2">Priority</th>
                    <th className="px-3.5 py-2">First Response Target</th>
                    <th className="px-3.5 py-2">Resolution Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-3.5 py-2 font-bold text-rose-700">URGENT</td>
                    <td className="px-3.5 py-2">1 Business Hour</td>
                    <td className="px-3.5 py-2">4 Business Hours</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-amber-700">HIGH</td>
                    <td className="px-3.5 py-2">4 Business Hours</td>
                    <td className="px-3.5 py-2">24 Business Hours</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-medium text-blue-700">MEDIUM</td>
                    <td className="px-3.5 py-2">8 Business Hours</td>
                    <td className="px-3.5 py-2">48 Business Hours</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-medium text-slate-700">LOW</td>
                    <td className="px-3.5 py-2">24 Business Hours</td>
                    <td className="px-3.5 py-2">72 Business Hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Configured Holidays */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Configured Public Holidays (SLA Paused)
            </h3>
            {loading ? (
              <p className="mt-2 text-xs text-slate-400 animate-pulse">Loading holidays…</p>
            ) : data?.holidays && data.holidays.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {data.holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-800 shadow-2xs"
                  >
                    <span className="font-semibold">{h.name}:</span>
                    <span className="font-mono text-[11px] text-slate-500">{formatDateTime(h.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No public holidays configured.</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98]"
          >
            Close Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
