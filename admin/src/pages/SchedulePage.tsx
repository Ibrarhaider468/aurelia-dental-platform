import { useEffect, useState, type FormEvent } from "react";
import {
  adminApi,
  type ClinicHoliday,
  type Doctor,
  type DoctorLeave,
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
  SuccessBanner,
  formatDate,
} from "../components/ui";

export default function SchedulePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [holidays, setHolidays] = useState<ClinicHoliday[]>([]);
  const [leaves, setLeaves] = useState<DoctorLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [holidayModal, setHolidayModal] = useState(false);
  const [leaveModal, setLeaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: "", title: "" });
  const [leaveForm, setLeaveForm] = useState({
    doctorId: "",
    date: "",
    reason: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [doctorList, holidayList, leaveList] = await Promise.all([
        adminApi.doctors.list(),
        adminApi.schedule.holidays(),
        adminApi.schedule.leaves(),
      ]);
      setDoctors(doctorList);
      setHolidays(holidayList);
      setLeaves(leaveList);
      if (!leaveForm.doctorId && doctorList[0]) {
        setLeaveForm((prev) => ({ ...prev, doctorId: doctorList[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveHoliday(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.schedule.createHoliday(holidayForm);
      setSuccess("Holiday created");
      setHolidayModal(false);
      setHolidayForm({ date: "", title: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveLeave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.schedule.createLeave(leaveForm.doctorId, {
        date: leaveForm.date,
        reason: leaveForm.reason || undefined,
      });
      setSuccess("Leave day created");
      setLeaveModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Schedule"
        subtitle="Clinic holidays and dentist leave days affect public slot generation"
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setHolidayModal(true)}
            >
              Add holiday
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setLeaveModal(true)}
            >
              Add leave day
            </button>
          </>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading && holidays.length === 0 && leaves.length === 0 ? (
        <PageLoader />
      ) : (
        <div className="split-layout">
          <Card
            title="Clinic holidays"
            subtitle="Full-clinic closure dates"
            actions={
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setHolidayModal(true)}
              >
                Add
              </button>
            }
          >
            {holidays.length === 0 ? (
              <EmptyState
                title="No holidays configured"
                text="Add clinic closure days so booking slots stay accurate."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setHolidayModal(true)}
                  >
                    Add holiday
                  </button>
                }
              />
            ) : (
              <div className="stack">
                {holidays.map((item) => (
                  <article key={item.id} className="entity-row">
                    <div>
                      <h3 className="cell-title" style={{ margin: 0 }}>
                        {item.title}
                      </h3>
                      <p className="cell-sub">{formatDate(item.date)}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={async () => {
                        if (!confirm("Delete holiday?")) return;
                        try {
                          await adminApi.schedule.deleteHoliday(item.id);
                          setSuccess("Holiday deleted");
                          await load();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Delete failed",
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Doctor leave days"
            subtitle="Individual dentist time off"
            actions={
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setLeaveModal(true)}
              >
                Add
              </button>
            }
          >
            {leaves.length === 0 ? (
              <EmptyState
                title="No leave days configured"
                text="Record dentist leave so public slots exclude those days."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setLeaveModal(true)}
                  >
                    Add leave day
                  </button>
                }
              />
            ) : (
              <div className="stack">
                {leaves.map((item) => (
                  <article key={item.id} className="entity-row">
                    <div>
                      <h3 className="cell-title" style={{ margin: 0 }}>
                        {item.doctor?.name || "Doctor"}
                      </h3>
                      <p className="cell-sub">
                        {formatDate(item.date)}
                        {item.reason ? ` · ${item.reason}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={async () => {
                        if (!confirm("Delete leave day?")) return;
                        try {
                          await adminApi.schedule.deleteLeave(
                            item.doctorId,
                            item.id,
                          );
                          setSuccess("Leave deleted");
                          await load();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Delete failed",
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {holidayModal && (
        <Modal title="Add clinic holiday" onClose={() => setHolidayModal(false)}>
          <form className="form-grid" onSubmit={saveHoliday}>
            <Field label="Date">
              <input
                type="date"
                required
                value={holidayForm.date}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, date: e.target.value })
                }
              />
            </Field>
            <Field label="Title">
              <input
                required
                value={holidayForm.title}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, title: e.target.value })
                }
              />
            </Field>
            <FormActions
              onCancel={() => setHolidayModal(false)}
              saving={saving}
            />
          </form>
        </Modal>
      )}

      {leaveModal && (
        <Modal title="Add doctor leave" onClose={() => setLeaveModal(false)}>
          <form className="form-grid" onSubmit={saveLeave}>
            <Field label="Doctor">
              <select
                required
                value={leaveForm.doctorId}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, doctorId: e.target.value })
                }
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                value={leaveForm.date}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, date: e.target.value })
                }
              />
            </Field>
            <Field label="Reason">
              <input
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
              />
            </Field>
            <FormActions onCancel={() => setLeaveModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
