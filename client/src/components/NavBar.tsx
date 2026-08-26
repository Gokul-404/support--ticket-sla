import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BusinessCalendarModal } from "./BusinessCalendarModal";

export function NavBar() {
  const { currentUser, logout } = useAuth();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="group flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">
                SLA Tracker
              </span>
              <span className="hidden rounded border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 sm:inline-block">
                Enterprise
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setCalendarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">SLA Calendar &amp; Holidays</span>
              <span className="sm:hidden">Calendar</span>
            </button>

            {currentUser && (
              <>
                <div className="flex items-center gap-2.5 rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 py-1 text-xs">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-white">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden font-medium text-slate-800 sm:inline">{currentUser.name}</span>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-700">
                    {currentUser.role}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
                  title="Sign out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <BusinessCalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />
    </>
  );
}
