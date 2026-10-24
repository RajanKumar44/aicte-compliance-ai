import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { configured, loading, session } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="py-12 text-center text-sm text-text-secondary" role="status">Checking your session…</p>;
  }
  if (!configured || !session) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return children;
}
