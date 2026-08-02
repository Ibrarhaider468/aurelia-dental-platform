import { useEffect, useState, type FormEvent } from "react";
import { adminApi, type Testimonial } from "../lib/api";
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
  patientName: "",
  review: "",
  rating: "5",
  isApproved: false,
};

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await adminApi.testimonials.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load testimonials");
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

  function openEdit(item: Testimonial) {
    setEditing(item);
    setForm({
      patientName: item.patientName,
      review: item.review,
      rating: String(item.rating),
      isApproved: item.isApproved,
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        patientName: form.patientName,
        review: form.review,
        rating: Number(form.rating),
        isApproved: form.isApproved,
      };
      if (editing) await adminApi.testimonials.update(editing.id, payload);
      else await adminApi.testimonials.create(payload);
      setSuccess(editing ? "Testimonial updated" : "Testimonial created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleApprove(item: Testimonial) {
    try {
      await adminApi.testimonials.update(item.id, {
        isApproved: !item.isApproved,
      });
      setSuccess(item.isApproved ? "Unapproved" : "Approved");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function remove(item: Testimonial) {
    if (!confirm("Delete testimonial?")) return;
    try {
      await adminApi.testimonials.remove(item.id);
      setSuccess("Testimonial deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Testimonials"
        subtitle="Approve and manage patient reviews"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add review
          </button>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <PageLoader />
      ) : (
        <Card
          title="Patient reviews"
          subtitle="Approve reviews before they appear on the website"
        >
          {items.length === 0 ? (
            <EmptyState
              title="No testimonials yet"
              text="Collect patient feedback and approve reviews for the public site."
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openCreate}
                >
                  Add review
                </button>
              }
            />
          ) : (
            <div className="stack">
              {items.map((item) => (
                <article key={item.id} className="entity-row">
                  <div>
                    <h3>
                      {item.patientName} · {item.rating}/5
                    </h3>
                    <p>{item.review}</p>
                    <div style={{ marginTop: "0.5rem" }}>
                      <StatusBadge
                        status={item.isApproved ? "Approved" : "Pending"}
                      />
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => toggleApprove(item)}
                    >
                      {item.isApproved ? "Unapprove" : "Approve"}
                    </button>
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
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit testimonial" : "Add testimonial"}
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
            <Field label="Rating">
              <input
                type="number"
                min={1}
                max={5}
                required
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </Field>
            <Field label="Review">
              <textarea
                rows={4}
                required
                value={form.review}
                onChange={(e) => setForm({ ...form, review: e.target.value })}
              />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.isApproved}
                onChange={(e) =>
                  setForm({ ...form, isApproved: e.target.checked })
                }
              />
              Approved
            </label>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
