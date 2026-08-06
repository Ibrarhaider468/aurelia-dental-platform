import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Stethoscope,
  Users,
  CircleDollarSign,
  Clock3,
  BadgePercent,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi, type DashboardData } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { hasPermission, PERMISSIONS } from "../lib/permissions";
import {
  BarChart,
  Card,
  ErrorBanner,
  PageHeader,
  PageLoader,
  StatCard,
  StatusBadge,
  formatDate,
  money,
} from "../components/ui";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canFinance = hasPermission(
    user?.role,
    PERMISSIONS.FINANCE_READ,
    user?.permissions,
  );
  const canAppointments = hasPermission(
    user?.role,
    PERMISSIONS.APPOINTMENTS_READ,
    user?.permissions,
  );
  const canPayments = hasPermission(
    user?.role,
    PERMISSIONS.PAYMENTS_READ,
    user?.permissions,
  );

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  const financeBars = useMemo(() => {
    if (!data?.finance) return [];
    return [
      {
        label: "Total revenue",
        value: data.finance.totalRevenue,
        display: money(data.finance.totalRevenue),
      },
      {
        label: data.finance.monthLabel || "This month",
        value: data.finance.monthlyRevenue,
        display: money(data.finance.monthlyRevenue),
      },
      {
        label: "Pending",
        value: data.finance.pendingPaymentsAmount,
        display: money(data.finance.pendingPaymentsAmount),
      },
      {
        label: "Memberships",
        value: data.finance.membershipRevenue,
        display: money(data.finance.membershipRevenue),
      },
      {
        label: "Refunded",
        value: data.finance.refundedAmount,
        display: money(data.finance.refundedAmount),
      },
    ];
  }, [data]);

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle={
          canFinance
            ? "Live clinic operations and financial performance"
            : "Live clinic operations for your access level"
        }
        actions={
          <div className="page-header__actions">
            {canAppointments ? (
              <Link to="/admin/appointments" className="btn btn-ghost">
                Appointments
              </Link>
            ) : null}
            {canPayments ? (
              <Link to="/admin/payments" className="btn btn-primary">
                Payments
              </Link>
            ) : null}
          </div>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {loading ? <PageLoader /> : null}

      {data ? (
        <>
          <div className="stat-grid">
            <StatCard
              label="Total appointments"
              value={data.totalAppointments}
              icon={CalendarDays}
              tone="info"
              hint="All-time bookings"
            />
            <StatCard
              label="Today"
              value={data.todaysAppointments}
              icon={Clock3}
              tone="accent"
              hint="Scheduled for today"
            />
            <StatCard
              label="Patients"
              value={data.totalPatients}
              icon={Users}
              tone="default"
            />
            {canFinance ? (
              <StatCard
                label="Total revenue"
                value={money(data.revenue)}
                icon={CircleDollarSign}
                tone="success"
              />
            ) : null}
            <StatCard
              label="Pending requests"
              value={data.pendingRequests}
              icon={Activity}
              tone="warning"
            />
            <StatCard
              label="Active doctors"
              value={data.activeDoctors}
              icon={Stethoscope}
            />
            {canFinance ? (
              <StatCard
                label="Active memberships"
                value={data.activeMemberships ?? 0}
                icon={BadgePercent}
                tone="accent"
              />
            ) : null}
            {canFinance ? (
              <StatCard
                label={`${data.finance?.monthLabel || "Month"} revenue`}
                value={money(data.finance?.monthlyRevenue || 0)}
                icon={CreditCard}
                tone="success"
              />
            ) : null}
          </div>

          <div className="split-layout">
            {canFinance ? (
            <Card
              title="Financial analytics"
              subtitle="Revenue composition across payment states"
              className="chart-card"
            >
              {financeBars.length ? (
                <BarChart items={financeBars} />
              ) : (
                <p className="muted">Finance metrics will appear once payments exist.</p>
              )}
              {data.finance ? (
                <div className="metric-pills">
                  <span className="metric-pill">
                    Paid appts · {data.finance.paidAppointments}
                  </span>
                  <span className="metric-pill">
                    Pending · {data.finance.pendingPaymentsCount}
                  </span>
                  <span className="metric-pill">
                    Failed · {data.finance.failedPaymentsCount}
                  </span>
                  <span className="metric-pill">
                    Refunded · {data.finance.refundedCount}
                  </span>
                </div>
              ) : null}
            </Card>
            ) : null}

            {canFinance ? (
            <Card title="Recent payments" subtitle="Latest settlement activity">
              {(data.finance?.recentPayments || []).length === 0 ? (
                <p className="muted">No payments yet.</p>
              ) : (
                <div className="payment-feed">
                  {data.finance?.recentPayments.map((p) => (
                    <div key={p.id} className="payment-feed__item">
                      <div>
                        <strong>{p.patient?.name || "Patient"}</strong>
                        <div className="cell-sub">
                          {p.method} · {p.gateway || "MANUAL"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong>{money(p.amount)}</strong>
                        <div style={{ marginTop: "0.35rem" }}>
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            ) : null}
          </div>

          <Card
            flush
            title="Recent appointments"
            subtitle="Newest booking activity across the clinic"
            actions={
              canAppointments ? (
                <Link to="/admin/appointments" className="btn btn-ghost btn-sm">
                  View all
                </Link>
              ) : null
            }
          >
            {data.recentAppointments.length === 0 ? (
              <div style={{ padding: "0 1.25rem 1.25rem" }}>
                <p className="muted">No appointments yet.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Service</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAppointments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="cell-title">{a.patientName}</div>
                          <div className="cell-sub">{a.email}</div>
                        </td>
                        <td>{a.service?.title}</td>
                        <td>{a.doctor?.name}</td>
                        <td>
                          {formatDate(a.date)}
                          <div className="cell-sub">{a.slot}</div>
                        </td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
