import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  adminApi,
  type Appointment,
  type Doctor,
  type Service,
} from "../lib/api";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  StatusBadge,
  SuccessBanner,
  Toolbar,
  formatDate,
} from "../components/ui";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
];

const empty = {
  patientName: "",
  email: "",
  phone: "",
  doctorId: "",
  serviceId: "",
  date: "",
  slot: "09:00",
  message: "",
  status: "PENDING",
  rescheduleReason: "",
};

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [calendar, setCalendar] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      doctorId: doctorFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
    }),
    [statusFilter, doctorFilter, dateFrom, dateTo, search],
  );

  async function load() {
    try {
      const [appointments, doctorList, serviceList, calendarRows] =
        await Promise.all([
          adminApi.appointments.list(filters),
          adminApi.doctors.list(),
          adminApi.services.list(),
          adminApi.appointments.calendar({
            from: dateFrom || undefined,
            to: dateTo || undefined,
            doctorId: doctorFilter || undefined,
          }),
        ]);
      setItems(appointments);
      setDoctors(doctorList);
      setServices(serviceList);
      setCalendar(calendarRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filters]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...empty,
      doctorId: doctors[0]?.id || "",
      serviceId: services[0]?.id || "",
    });
    setModal(true);
  }

  function openEdit(item: Appointment) {
    setEditing(item);
    setForm({
      patientName: item.patientName,
      email: item.email,
      phone: item.phone,
      doctorId: item.doctorId,
      serviceId: item.serviceId,
      date: item.date.slice(0, 10),
      slot: item.slot,
      message: item.message || "",
      status: item.status,
      rescheduleReason: "",
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        message: form.message || null,
        rescheduleReason: form.rescheduleReason || null,
      };
      if (editing) await adminApi.appointments.update(editing.id, payload);
      else await adminApi.appointments.create(payload);
      setSuccess(editing ? "Appointment updated" : "Appointment created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(item: Appointment, status: string) {
    try {
      await adminApi.appointments.update(item.id, { status });
      setSuccess(`Marked ${status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function remove(item: Appointment) {
    if (!confirm("Delete this appointment?")) return;
    try {
      await adminApi.appointments.remove(item.id);
      setSuccess("Appointment deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function exportCsv() {
    try {
      const token = localStorage.getItem("aurelia_token");
      const res = await fetch(adminApi.appointments.exportUrl(filters), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Export downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  const calendarByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const row of calendar) {
      const key = row.date.slice(0, 10);
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [calendar]);

  return (
    <div className="page">
      <PageHeader
        title="Appointments"
        subtitle="Workflow, calendar, filters, and CSV export"
        actions={
          <>
            <div className="segmented">
              <button
                type="button"
                className={view === "list" ? "is-active" : undefined}
                onClick={() => setView("list")}
              >
                List
              </button>
              <button
                type="button"
                className={view === "calendar" ? "is-active" : undefined}
                onClick={() => setView("calendar")}
              >
                Calendar
              </button>
            </div>
            <button type="button" className="btn btn-ghost" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              New appointment
            </button>
          </>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading && items.length === 0 && calendar.length === 0 ? (
        <PageLoader />
      ) : (
        <>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search patient, email, phone"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
            >
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Toolbar>

          {view === "calendar" ? (
            <Card title="Calendar" subtitle="Appointments grouped by date">
              {calendarByDate.length === 0 ? (
                <EmptyState
                  title="No appointments in range"
                  text="Widen the date range or create a new booking to populate the calendar."
                  action={
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openCreate}
                    >
                      New appointment
                    </button>
                  }
                />
              ) : (
                <div className="stack">
                  {calendarByDate.map(([date, rows]) => (
                    <div key={date}>
                      <h3>{formatDate(date)}</h3>
                      <ul className="simple-list">
                        {rows.map((row) => (
                          <li key={row.id}>
                            {row.slot} · {row.patientName} · {row.doctor?.name} ·{" "}
                            {row.service?.title} ·{" "}
                            <StatusBadge status={row.status} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card flush title="Appointment list">
              {items.length === 0 ? (
                <EmptyState
                  title="No appointments found"
                  text="Create a booking or adjust filters to see matching appointments."
                  action={
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openCreate}
                    >
                      New appointment
                    </button>
                  }
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Service</th>
                        <th>Doctor</th>
                        <th>When</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.patientName}</strong>
                            <div className="muted small">
                              {item.email} · {item.phone}
                            </div>
                          </td>
                          <td>{item.service?.title}</td>
                          <td>{item.doctor?.name}</td>
                          <td>
                            {formatDate(item.date)} · {item.slot}
                          </td>
                          <td>
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="row-actions">
                            {item.status === "PENDING" && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setStatus(item, "CONFIRMED")}
                              >
                                Confirm
                              </button>
                            )}
                            {["PENDING", "CONFIRMED", "RESCHEDULED"].includes(
                              item.status,
                            ) && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setStatus(item, "CANCELLED")}
                              >
                                Cancel
                              </button>
                            )}
                            {item.status === "CONFIRMED" && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setStatus(item, "COMPLETED")}
                              >
                                Complete
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => openEdit(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => remove(item)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit appointment" : "New appointment"}
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Patient name">
              <input
                required
                value={form.patientName}
                onChange={(e) =>
                  setForm({ ...form, patientName: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Doctor">
              <select
                required
                value={form.doctorId}
                onChange={(e) =>
                  setForm({ ...form, doctorId: e.target.value })
                }
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <select
                required
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value })
                }
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Time slot">
              <input
                type="time"
                required
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reschedule / status note">
              <input
                value={form.rescheduleReason}
                onChange={(e) =>
                  setForm({ ...form, rescheduleReason: e.target.value })
                }
              />
            </Field>
            <Field label="Message">
              <textarea
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </Field>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
