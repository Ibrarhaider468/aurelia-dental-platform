import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  CreditCard,
  GalleryHorizontalEnd,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Settings,
  Shield,
  Stethoscope,
  Users,
  FilePenLine,
  Sparkles,
  Percent,
  Inbox,
  UserCog,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { initials } from "./ui";
import {
  canAccessPath,
  hasPermission,
  PERMISSIONS,
  roleLabel,
} from "../lib/permissions";

const sections = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Clinic",
    items: [
      { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
      { to: "/admin/services", label: "Services", icon: Sparkles },
      { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
      { to: "/admin/schedule", label: "Schedule", icon: CalendarClock },
      { to: "/admin/patients", label: "Patients", icon: Users },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/payments", label: "Payments", icon: CreditCard },
      { to: "/admin/memberships", label: "Memberships", icon: Percent },
      { to: "/admin/insurance", label: "Insurance", icon: Shield },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/gallery", label: "Gallery", icon: GalleryHorizontalEnd },
      { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { to: "/admin/cms", label: "Website CMS", icon: FilePenLine },
      { to: "/admin/contact-messages", label: "Contact Messages", icon: Inbox },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Administration",
    items: [{ to: "/admin/users", label: "Users", icon: UserCog }],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const visibleSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          canAccessPath(item.to, user?.role, user?.permissions),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [user?.role, user?.permissions]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="sidebar__mark" aria-hidden="true" />
          Aurelia
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      </header>

      {open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside className={`sidebar${open ? " is-open" : ""}`}>
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true" />
          <div>
            <strong>Aurelia</strong>
            <small>Admin Console</small>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon sidebar__close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Admin">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <div className="nav-section">{section.label}</div>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  className={({ isActive }) =>
                    `sidebar__link${isActive ? " is-active" : ""}`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="avatar" aria-hidden="true">
              {initials(user?.name)}
            </div>
            <div>
              <strong>{user?.name}</strong>
              <span>{roleLabel(user?.role)}</span>
              {hasPermission(
                user?.role,
                PERMISSIONS.AVAILABILITY_OWN,
                user?.permissions,
              ) && user?.doctorId ? (
                <small>Scoped doctor access</small>
              ) : null}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
