import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPath } from "../lib/permissions";

export default function RoleRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading-screen">Loading admin…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const path =
    location.pathname === "/"
      ? "/"
      : `/${location.pathname.split("/").filter(Boolean)[0] || ""}`;

  if (!canAccessPath(path, user.role, user.permissions)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
