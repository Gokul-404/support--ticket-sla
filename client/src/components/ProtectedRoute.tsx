import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  const token = localStorage.getItem("sla_tracker_token");

  if (!token) return <Navigate to="/login" replace />;
  if (loading) {
    return <p className="p-8 text-sm text-gray-500">Loading…</p>;
  }
  if (!currentUser) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
