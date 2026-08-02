import { useEffect, useState, type FormEvent } from "react";
import {
  adminApi,
  type InsuranceProvider,
  type Patient,
  type PatientInsurance,
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
  StatusBadge,
  SuccessBanner,
} from "../components/ui";

const empty = {
  name: "",
  details: "",
  acceptedPlans: "",
  logo: "",
  isActive: true,
};

export default function InsurancePage() {
  const [items, setItems] = useState<InsuranceProvider[]>([]);
  const [patientInsurance, setPatientInsurance] = useState<PatientInsurance[]>(
    [],
  );
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [patientModal, setPatientModal] = useState(false);
  const [editing, setEditing] = useState<InsuranceProvider | null>(null);
  const [form, setForm] = useState(empty);
  const [patientForm, setPatientForm] = useState({
    patientId: "",
    providerId: "",
    policyNumber: "",
    groupNumber: "",
    holderName: "",
    status: "PENDING",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [providers, records, patientList] = await Promise.all([
        adminApi.insurance.list(),
        adminApi.insurance.patientList(),
        adminApi.patients.list(),
      ]);
      setItems(providers);
      setPatientInsurance(records);
      setPatients(patientList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insurance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModal(true);
  }

  function openPatientPolicy() {
    setPatientForm({
      patientId: patients[0]?.id || "",
      providerId: items[0]?.id || "",
      policyNumber: "",
      groupNumber: "",
      holderName: "",
      status: "PENDING",
    });
    setPatientModal(true);
  }

  function openEdit(item: InsuranceProvider) {
    setEditing(item);
    setForm({
      name: item.name,
      details: item.details,
      acceptedPlans: (item.acceptedPlans || []).join("\n"),
      logo: item.logo || "",
      isActive: item.isActive,
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        details: form.details,
        acceptedPlans: form.acceptedPlans
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        logo: form.logo || null,
        isActive: form.isActive,
      };
      if (editing) await adminApi.insurance.update(editing.id, payload);
      else await adminApi.insurance.create(payload);
      setSuccess(editing ? "Provider updated" : "Provider created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function savePatientInsurance(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.insurance.createPatient(patientForm);
      setSuccess("Patient insurance saved");
      setPatientModal(false);
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
        title="Insurance"
        subtitle="Providers, accepted plans, and patient policy verification"
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={openPatientPolicy}
            >
              Add patient policy
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Add provider
            </button>
          </>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <PageLoader />
      ) : (
        <>
          <Card
            title="Insurance providers"
            subtitle="Networks and accepted plan lists"
          >
            {items.length === 0 ? (
              <EmptyState
                title="No insurance providers yet"
                text="Add accepted insurers so patients can attach and verify policies."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCreate}
                  >
                    Add provider
                  </button>
                }
              />
            ) : (
              <div className="stack">
                {items.map((item) => (
                  <article key={item.id} className="entity-row">
                    <div>
                      <h3>
                        {item.name}{" "}
                        <StatusBadge
                          status={item.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </h3>
                      <p>{item.details}</p>
                      {(item.acceptedPlans || []).length > 0 ? (
                        <p className="muted small">
                          Plans: {(item.acceptedPlans || []).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="row-actions">
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
                        onClick={async () => {
                          if (!confirm(`Delete ${item.name}?`)) return;
                          await adminApi.insurance.remove(item.id);
                          setSuccess("Provider deleted");
                          await load();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card flush title="Patient insurance">
            {patientInsurance.length === 0 ? (
              <EmptyState
                title="No patient policies yet"
                text="Attach a policy to a patient, then verify coverage before treatment."
                action={
                  items.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openPatientPolicy}
                    >
                      Add patient policy
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Provider</th>
                      <th>Policy</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {patientInsurance.map((row) => (
                      <tr key={row.id}>
                        <td>{row.patient?.name}</td>
                        <td>{row.provider?.name}</td>
                        <td>{row.policyNumber}</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="row-actions">
                          {row.status !== "VERIFIED" && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() =>
                                adminApi.insurance
                                  .updatePatient(row.id, { status: "VERIFIED" })
                                  .then(() => {
                                    setSuccess("Policy verified");
                                    return load();
                                  })
                              }
                            >
                              Verify
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() =>
                              adminApi.insurance
                                .removePatient(row.id)
                                .then(() => {
                                  setSuccess("Record deleted");
                                  return load();
                                })
                            }
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
        </>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit provider" : "Add provider"}
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
            <Field label="Details">
              <textarea
                rows={4}
                required
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </Field>
            <Field label="Accepted plans (one per line)">
              <textarea
                rows={3}
                value={form.acceptedPlans}
                onChange={(e) =>
                  setForm({ ...form, acceptedPlans: e.target.value })
                }
              />
            </Field>
            <Field label="Logo URL">
              <input
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
              />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Active
            </label>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}

      {patientModal && (
        <Modal
          title="Add patient insurance"
          onClose={() => setPatientModal(false)}
        >
          <form className="form-grid" onSubmit={savePatientInsurance}>
            <Field label="Patient">
              <select
                required
                value={patientForm.patientId}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, patientId: e.target.value })
                }
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider">
              <select
                required
                value={patientForm.providerId}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, providerId: e.target.value })
                }
              >
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Policy number">
              <input
                required
                value={patientForm.policyNumber}
                onChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    policyNumber: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Group number">
              <input
                value={patientForm.groupNumber}
                onChange={(e) =>
                  setPatientForm({
                    ...patientForm,
                    groupNumber: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Holder name">
              <input
                value={patientForm.holderName}
                onChange={(e) =>
                  setPatientForm({ ...patientForm, holderName: e.target.value })
                }
              />
            </Field>
            <FormActions
              onCancel={() => setPatientModal(false)}
              saving={saving}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
