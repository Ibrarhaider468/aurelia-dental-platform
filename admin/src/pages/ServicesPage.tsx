import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adminApi, type Service } from "../lib/api";
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

const empty = {
  title: "",
  description: "",
  duration: "60",
  price: "",
  image: "",
  isActive: true,
};

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await adminApi.services.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
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
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.slug || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModal(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setForm({
      title: service.title,
      description: service.description,
      duration: String(service.duration),
      price: String(service.price),
      image: service.image || "",
      isActive: service.isActive,
    });
    setModal(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        duration: Number(form.duration),
        price: Number(form.price),
        image: form.image || null,
        isActive: form.isActive,
      };
      if (editing) await adminApi.services.update(editing.id, payload);
      else await adminApi.services.create(payload);
      setSuccess(editing ? "Service updated" : "Service created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(service: Service) {
    if (!confirm(`Delete ${service.title}?`)) return;
    try {
      await adminApi.services.remove(service.id);
      setSuccess("Service deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Services"
        subtitle="Treatments shown on the public website and booking flow"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add service
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
              placeholder="Search services…"
            />
          </Toolbar>

          <Card
            flush
            title="Treatments"
            subtitle={`${filtered.length} of ${items.length} services`}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: "0 1.25rem 1.25rem" }}>
                <EmptyState
                  title={items.length === 0 ? "No services yet" : "No matches"}
                  text={
                    items.length === 0
                      ? "Add treatments for the website and booking flow."
                      : "Try a different search term."
                  }
                  action={
                    items.length === 0 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openCreate}
                      >
                        Add service
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Duration</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((service) => (
                      <tr key={service.id}>
                        <td>
                          <div className="cell-title">{service.title}</div>
                          <div className="cell-sub">{service.slug}</div>
                        </td>
                        <td>{service.duration} min</td>
                        <td>{money(service.price)}</td>
                        <td>
                          <StatusBadge
                            status={service.isActive ? "Active" : "Inactive"}
                          />
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => openEdit(service)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => remove(service)}
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
          title={editing ? "Edit service" : "Add service"}
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Title">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={5}
                required
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </Field>
            <Field label="Starting price">
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field label="Image URL">
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={4}
                required
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
    </div>
  );
}
