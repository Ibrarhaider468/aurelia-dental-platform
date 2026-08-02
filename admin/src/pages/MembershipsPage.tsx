import { useEffect, useState, type FormEvent } from "react";
import {
  adminApi,
  type MembershipPlan,
  type MembershipSubscription,
  type Patient,
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
  money,
} from "../components/ui";

const empty = {
  name: "",
  price: "",
  billingCycle: "monthly",
  durationMonths: "1",
  benefits: "",
  includedTreatments: "",
  description: "",
  isActive: true,
};

export default function MembershipsPage() {
  const [items, setItems] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<MembershipSubscription[]>(
    [],
  );
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [subscribeModal, setSubscribeModal] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [form, setForm] = useState(empty);
  const [subscribeForm, setSubscribeForm] = useState({
    planId: "",
    patientId: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [plans, subs, patientList] = await Promise.all([
        adminApi.memberships.list(),
        adminApi.memberships.subscriptions(),
        adminApi.patients.list(),
      ]);
      setItems(plans);
      setSubscriptions(subs);
      setPatients(patientList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
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

  function openSubscribe() {
    setSubscribeForm({
      planId: items[0]?.id || "",
      patientId: patients[0]?.id || "",
    });
    setSubscribeModal(true);
  }

  function openEdit(plan: MembershipPlan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      price: String(plan.price),
      billingCycle: plan.billingCycle,
      durationMonths: String(plan.durationMonths || 1),
      benefits: plan.benefits.join("\n"),
      includedTreatments: (plan.includedTreatments || []).join("\n"),
      description: plan.description || "",
      isActive: plan.isActive,
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
        price: Number(form.price),
        billingCycle: form.billingCycle,
        durationMonths: Number(form.durationMonths),
        benefits: form.benefits
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
        includedTreatments: form.includedTreatments
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
        description: form.description || null,
        isActive: form.isActive,
      };
      if (editing) await adminApi.memberships.update(editing.id, payload);
      else await adminApi.memberships.create(payload);
      setSuccess(editing ? "Plan updated" : "Plan created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.memberships.subscribe(subscribeForm);
      setSuccess("Subscription created with pending payment");
      setSubscribeModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscribe failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Memberships"
        subtitle="Plans, duration, included treatments, and subscriptions"
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={openSubscribe}
            >
              Subscribe patient
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Add plan
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
          <Card title="Membership plans" subtitle="Pricing and included care">
            {items.length === 0 ? (
              <EmptyState
                title="No membership plans yet"
                text="Create a plan to offer recurring care packages and patient subscriptions."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCreate}
                  >
                    Add plan
                  </button>
                }
              />
            ) : (
              <div className="stack">
                {items.map((plan) => (
                  <article key={plan.id} className="entity-row">
                    <div>
                      <h3>
                        {plan.name} · {money(plan.price)}/{plan.billingCycle}
                      </h3>
                      <p className="muted">
                        {plan.durationMonths || 1} month(s) ·{" "}
                        {plan._count?.subscriptions ?? 0} subscriptions ·{" "}
                        <StatusBadge
                          status={plan.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </p>
                      <ul className="simple-list">
                        {plan.benefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      {(plan.includedTreatments || []).length > 0 ? (
                        <p className="muted small">
                          Treatments:{" "}
                          {(plan.includedTreatments || []).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openEdit(plan)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={async () => {
                          if (!confirm(`Delete ${plan.name}?`)) return;
                          await adminApi.memberships.remove(plan.id);
                          setSuccess("Plan deleted");
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

          <Card flush title="Subscriptions">
            {subscriptions.length === 0 ? (
              <EmptyState
                title="No subscriptions yet"
                text="Subscribe a patient to an active plan to start recurring membership billing."
                action={
                  items.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openSubscribe}
                    >
                      Subscribe patient
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
                      <th>Plan</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.patient?.name}</td>
                        <td>{sub.plan?.name}</td>
                        <td>
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="row-actions">
                          {sub.status !== "ACTIVE" && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() =>
                                adminApi.memberships
                                  .updateSubscription(sub.id, "ACTIVE")
                                  .then(() => {
                                    setSuccess("Subscription activated");
                                    return load();
                                  })
                              }
                            >
                              Activate
                            </button>
                          )}
                          {sub.status === "ACTIVE" && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() =>
                                adminApi.memberships
                                  .updateSubscription(sub.id, "CANCELLED")
                                  .then(() => {
                                    setSuccess("Subscription cancelled");
                                    return load();
                                  })
                              }
                            >
                              Cancel
                            </button>
                          )}
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
          title={editing ? "Edit plan" : "Add plan"}
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
            <Field label="Price">
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="Billing cycle">
              <input
                value={form.billingCycle}
                onChange={(e) =>
                  setForm({ ...form, billingCycle: e.target.value })
                }
              />
            </Field>
            <Field label="Duration (months)">
              <input
                type="number"
                min={1}
                value={form.durationMonths}
                onChange={(e) =>
                  setForm({ ...form, durationMonths: e.target.value })
                }
              />
            </Field>
            <Field label="Benefits (one per line)">
              <textarea
                rows={4}
                value={form.benefits}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              />
            </Field>
            <Field label="Included treatments (one per line)">
              <textarea
                rows={3}
                value={form.includedTreatments}
                onChange={(e) =>
                  setForm({ ...form, includedTreatments: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
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

      {subscribeModal && (
        <Modal title="Subscribe patient" onClose={() => setSubscribeModal(false)}>
          <form className="form-grid" onSubmit={subscribe}>
            <Field label="Plan">
              <select
                required
                value={subscribeForm.planId}
                onChange={(e) =>
                  setSubscribeForm({ ...subscribeForm, planId: e.target.value })
                }
              >
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Patient">
              <select
                required
                value={subscribeForm.patientId}
                onChange={(e) =>
                  setSubscribeForm({
                    ...subscribeForm,
                    patientId: e.target.value,
                  })
                }
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <FormActions
              onCancel={() => setSubscribeModal(false)}
              saving={saving}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
