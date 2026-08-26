import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

function getPasswordStrength(pass: string) {
  if (!pass) return null;
  const checks = {
    length: pass.length >= 8,
    casing: /[A-Z]/.test(pass) && /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    symbol: /[^A-Za-z0-9]/.test(pass),
  };
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 1) return { score, label: "Weak", color: "text-rose-600", barColor: "bg-rose-500", checks };
  if (score === 2) return { score, label: "Fair", color: "text-amber-600", barColor: "bg-amber-500", checks };
  if (score === 3) return { score, label: "Good", color: "text-blue-600", barColor: "bg-blue-500", checks };
  return { score, label: "Strong", color: "text-emerald-600", barColor: "bg-emerald-500", checks };
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("REPORTER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password, role);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
            Create Account
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Register as a ticket reporter or support staff agent
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-7 shadow-lg shadow-slate-200/40 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Riya Sharma"
                className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="riya@company.com"
                className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-200/90 bg-slate-50/50 px-3.5 py-2 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {strength && (
                <div className="mt-2.5 space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-semibold ${strength.color}`}>{strength.label}</span>
                  </div>
                  <div className="flex h-1 w-full gap-1 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.barColor : "bg-slate-200"}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.barColor : "bg-slate-200"}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.barColor : "bg-slate-200"}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 4 ? strength.barColor : "bg-slate-200"}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 text-[10px]">
                    <div className={`flex items-center gap-1 ${strength.checks.length ? "font-medium text-emerald-600" : "text-slate-400"}`}>
                      <span>{strength.checks.length ? "✓" : "○"}</span> 8+ chars
                    </div>
                    <div className={`flex items-center gap-1 ${strength.checks.casing ? "font-medium text-emerald-600" : "text-slate-400"}`}>
                      <span>{strength.checks.casing ? "✓" : "○"}</span> Upper &amp; lower
                    </div>
                    <div className={`flex items-center gap-1 ${strength.checks.number ? "font-medium text-emerald-600" : "text-slate-400"}`}>
                      <span>{strength.checks.number ? "✓" : "○"}</span> Number (0-9)
                    </div>
                    <div className={`flex items-center gap-1 ${strength.checks.symbol ? "font-medium text-emerald-600" : "text-slate-400"}`}>
                      <span>{strength.checks.symbol ? "✓" : "○"}</span> Symbol (!@#$)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600">
                Assigned Role
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("REPORTER")}
                  className={`rounded-lg border py-2 text-xs font-semibold transition ${
                    role === "REPORTER"
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200/90 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Reporter
                </button>
                <button
                  type="button"
                  onClick={() => setRole("AGENT")}
                  className={`rounded-lg border py-2 text-xs font-semibold transition ${
                    role === "AGENT"
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200/90 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Support Agent
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Registering…" : "Register Account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-slate-900 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
