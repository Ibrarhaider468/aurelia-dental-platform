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
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  const parts = location.pathname.split("/").filter(Boolean);
  // /admin → "/", /admin/doctors → "/doctors"
  const path =
    parts[0] === "admin"
      ? parts.length <= 1
        ? "/"
        : `/${parts[1]}`
      : location.pathname === "/"
        ? "/"
        : `/${parts[0] || ""}`;

  if (!canAccessPath(path, user.role, user.permissions)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
