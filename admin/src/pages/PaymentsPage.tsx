import { useEffect, useState, type FormEvent } from "react";
import { adminApi, type Patient, type Payment } from "../lib/api";
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
  money,
} from "../components/ui";

const METHODS = [
  "PRIVATE",
  "INSURANCE",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "APPLE_PAY",
  "GOOGLE_PAY",
  "BANK_TRANSFER",
  "FINANCE_PLAN",
  "MEMBERSHIP",
];

const STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"];

const empty = {
  patientId: "",
  appointmentId: "",
  amount: "",
  method: "PRIVATE",
  status: "PENDING",
  gateway: "MANUAL",
  providerRef: "",
  notes: "",
};

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [patientFilter, setPatientFilter] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [payments, patientList] = await Promise.all([
        adminApi.payments.list({
          status: statusFilter || undefined,
          patientId: patientFilter || undefined,
          appointmentId: appointmentFilter || undefined,
          search: search || undefined,
        }),
        adminApi.patients.list(),
      ]);
      setItems(payments);
      setPatients(patientList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter, patientFilter, appointmentFilter, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, patientId: patients[0]?.id || "" });
    setModal(true);
  }

  function openEdit(payment: Payment) {
    setEditing(payment);
    setForm({
      patientId: payment.patientId || "",
      appointmentId: payment.appointmentId || "",
      amount: String(payment.amount),
      method: payment.method,
      status: payment.status,
      gateway: payment.gateway || "MANUAL",
      providerRef: payment.providerRef || "",
      notes: payment.notes || "",
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        patientId: form.patientId || null,
        appointmentId: form.appointmentId || null,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        gateway: form.gateway,
        providerRef: form.providerRef || null,
        notes: form.notes || null,
      };
      if (editing) await adminApi.payments.update(editing.id, payload);
      else await adminApi.payments.create(payload);
      setSuccess(editing ? "Payment updated" : "Payment created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function prepareCheckout(payment: Payment) {
    try {
      const result = await adminApi.payments.checkout(payment.id, {
        gateway: "STRIPE",
        customerEmail: payment.patient?.email,
        description: "Clinic payment checkout",
      });
      setSuccess(
        `Checkout prepared: ${String(result.checkout.sessionId || "session")}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Payments"
        subtitle="Search, filter, update status, and prepare gateway checkout"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Record payment
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
              placeholder="Search ref, notes, patient"
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
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
            >
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Appointment ID filter"
              value={appointmentFilter}
              onChange={(e) => setAppointmentFilter(e.target.value)}
            />
          </Toolbar>

          <Card flush title="Payment ledger">
            {items.length === 0 ? (
              <EmptyState
                title="No payments found"
                text="Record a payment or adjust filters to see matching transactions."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCreate}
                  >
                    Record payment
                  </button>
                }
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Gateway / Ref</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          {payment.patient?.name || "—"}
                          <div className="muted small">
                            {payment.appointmentId
                              ? `Appt ${payment.appointmentId.slice(0, 8)}…`
                              : "No appointment"}
                          </div>
                        </td>
                        <td>{money(payment.amount)}</td>
                        <td>{payment.method}</td>
                        <td>
                          <StatusBadge status={payment.status} />
                        </td>
                        <td>
                          {payment.gateway || "MANUAL"}
                          <div className="muted small">
                            {payment.providerRef || "—"}
                          </div>
                        </td>
                        <td className="row-actions">
                          {payment.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() =>
                                  adminApi.payments
                                    .update(payment.id, { status: "PAID" })
                                    .then(() => {
                                      setSuccess("Marked PAID");
                                      return load();
                                    })
                                    .catch((err) =>
                                      setError(
                                        err instanceof Error
                                          ? err.message
                                          : "Update failed",
                                      ),
                                    )
                                }
                              >
                                Mark paid
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => prepareCheckout(payment)}
                              >
                                Prepare Stripe
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => openEdit(payment)}
                          >
                            Edit
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
          title={editing ? "Edit payment" : "Record payment"}
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Patient">
              <select
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
              >
                <option value="">None</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Appointment ID">
              <input
                value={form.appointmentId}
                onChange={(e) =>
                  setForm({ ...form, appointmentId: e.target.value })
                }
              />
            </Field>
            <Field label="Amount">
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
            <Field label="Method">
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
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
            <Field label="Gateway">
              <select
                value={form.gateway}
                onChange={(e) => setForm({ ...form, gateway: e.target.value })}
              >
                {[
                  "MANUAL",
                  "STRIPE",
                  "PAYPAL",
                  "CARD",
                  "APPLE_PAY",
                  "GOOGLE_PAY",
                ].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Transaction reference">
              <input
                value={form.providerRef}
                onChange={(e) =>
                  setForm({ ...form, providerRef: e.target.value })
                }
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
