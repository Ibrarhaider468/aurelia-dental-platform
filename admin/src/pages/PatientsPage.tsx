import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adminApi, type Patient, type PatientDetail } from "../lib/api";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  InlineLoader,
  Modal,
  PageHeader,
  PageLoader,
  SearchInput,
  StatusBadge,
  SuccessBanner,
  Toolbar,
  formatDate,
} from "../components/ui";

const empty = { name: "", email: "", phone: "", medicalNotes: "" };

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await adminApi.patients.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q),
    );
  }, [items, search]);

  async function view(patient: Patient) {
    setDetailLoading(true);
    try {
      setDetail(await adminApi.patients.get(patient.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient");
    } finally {
      setDetailLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModal(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setForm({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      medicalNotes: patient.medicalNotes || "",
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
        medicalNotes: form.medicalNotes || null,
      };
      if (editing) await adminApi.patients.update(editing.id, payload);
      else await adminApi.patients.create(payload);
      setSuccess(editing ? "Patient updated" : "Patient created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(patient: Patient) {
    if (!confirm(`Delete ${patient.name}?`)) return;
    try {
      await adminApi.patients.remove(patient.id);
      if (detail?.id === patient.id) setDetail(null);
      setSuccess("Patient deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Patients"
        subtitle="Profiles, history, and clinical notes"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add patient
          </button>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading && items.length === 0 ? (
        <PageLoader />
      ) : (
        <>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search patients…"
            />
          </Toolbar>

          <div className="split-layout">
            <Card
              title="Patient list"
              subtitle={`${filtered.length} of ${items.length} patients`}
            >
              {filtered.length === 0 ? (
                <EmptyState
                  title={items.length === 0 ? "No patients yet" : "No matches"}
                  text={
                    items.length === 0
                      ? "Create a patient profile to start tracking history and notes."
                      : "Try a different name, email, or phone."
                  }
                  action={
                    items.length === 0 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openCreate}
                      >
                        Add patient
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="stack">
                  {filtered.map((patient) => (
                    <article
                      key={patient.id}
                      className="entity-row"
                      style={
                        detail?.id === patient.id
                          ? { borderColor: "var(--accent)" }
                          : undefined
                      }
                    >
                      <div>
                        <h3 className="cell-title" style={{ margin: 0 }}>
                          {patient.name}
                        </h3>
                        <p className="cell-sub">
                          {patient.email} · {patient.phone}
                        </p>
                        <p className="cell-sub">
                          {patient._count?.appointments ?? 0} appointments ·{" "}
                          {patient._count?.payments ?? 0} payments
                        </p>
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => view(patient)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => openEdit(patient)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => remove(patient)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Patient detail"
              subtitle={
                detail
                  ? `${detail.name} · full history`
                  : "Select a patient to inspect"
              }
            >
              {detailLoading ? (
                <InlineLoader label="Loading patient…" />
              ) : !detail ? (
                <EmptyState
                  title="No patient selected"
                  text="Select a patient from the list to view appointments, payments, and notes."
                />
              ) : (
                <div className="stack">
                  <div>
                    <h3 className="cell-title" style={{ margin: 0 }}>
                      {detail.name}
                    </h3>
                    <p className="cell-sub">
                      {detail.email} · {detail.phone}
                    </p>
                    <p>{detail.medicalNotes || "No medical notes."}</p>
                  </div>
                  <div>
                    <h4>Appointments</h4>
                    {detail.appointments.length === 0 ? (
                      <p className="muted">None</p>
                    ) : (
                      <ul className="simple-list">
                        {detail.appointments.map((a) => (
                          <li key={a.id}>
                            <div className="cell-title">
                              {formatDate(a.date)} {a.slot}
                            </div>
                            <div className="cell-sub">
                              {a.service?.title}{" "}
                              <StatusBadge status={a.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Previous treatments</h4>
                    {(detail.previousTreatments || []).length === 0 ? (
                      <p className="muted">None yet</p>
                    ) : (
                      <ul className="simple-list">
                        {detail.previousTreatments?.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Payments</h4>
                    {detail.payments.length === 0 ? (
                      <p className="muted">None</p>
                    ) : (
                      <ul className="simple-list">
                        {detail.payments.map((p) => (
                          <li key={p.id}>
                            <div className="cell-title">
                              {p.method} · {String(p.amount)}
                            </div>
                            <div className="cell-sub">
                              <StatusBadge status={p.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Membership</h4>
                    {(detail.memberships || []).length === 0 ? (
                      <p className="muted">None</p>
                    ) : (
                      <ul className="simple-list">
                        {detail.memberships.map((m) => (
                          <li key={m.id}>
                            <div className="cell-title">
                              {m.plan?.name || "Plan"}
                            </div>
                            <div className="cell-sub">
                              <StatusBadge status={m.status} />
                              {m.endDate
                                ? ` · until ${new Date(m.endDate).toLocaleDateString()}`
                                : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Insurance</h4>
                    {(detail.insuranceDetails || []).length === 0 ? (
                      <p className="muted">None</p>
                    ) : (
                      <ul className="simple-list">
                        {detail.insuranceDetails?.map((ins) => (
                          <li key={ins.id}>
                            <div className="cell-title">
                              {ins.provider?.name || "Provider"} ·{" "}
                              {ins.policyNumber}
                            </div>
                            <div className="cell-sub">
                              <StatusBadge status={ins.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Clinical notes</h4>
                    {(detail.clinicalNotes || []).length === 0 ? (
                      <p className="muted">No notes yet</p>
                    ) : (
                      <ul className="simple-list">
                        {detail.clinicalNotes?.map((n) => (
                          <li key={n.id}>
                            {n.note}
                            <div className="cell-sub">
                              {new Date(n.createdAt).toLocaleString()}
                              {n.createdBy ? ` · ${n.createdBy}` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <form
                      className="form-grid"
                      style={{ marginTop: "0.75rem" }}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const note = String(fd.get("note") || "").trim();
                        if (!note) return;
                        try {
                          await adminApi.patients.addNote(detail.id, note);
                          setSuccess("Note added");
                          setDetail(await adminApi.patients.get(detail.id));
                          e.currentTarget.reset();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Note failed",
                          );
                        }
                      }}
                    >
                      <Field label="Add note">
                        <textarea name="note" rows={3} required />
                      </Field>
                      <button type="submit" className="btn btn-primary">
                        Save note
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit patient" : "Add patient"}
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <Field label="Medical notes">
              <textarea
                rows={4}
                value={form.medicalNotes}
                onChange={(e) =>
                  setForm({ ...form, medicalNotes: e.target.value })
                }
              />
            </Field>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
