import { useEffect, useState, type FormEvent } from "react";
import { adminApi, type GalleryItem } from "../lib/api";
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
  beforeImage: "",
  afterImage: "",
  treatment: "",
  caption: "",
  isPublished: false,
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await adminApi.gallery.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery");
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

  function openEdit(item: GalleryItem) {
    setEditing(item);
    setForm({
      beforeImage: item.beforeImage,
      afterImage: item.afterImage,
      treatment: item.treatment,
      caption: item.caption || "",
      isPublished: item.isPublished,
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
        caption: form.caption || null,
      };
      if (editing) await adminApi.gallery.update(editing.id, payload);
      else await adminApi.gallery.create(payload);
      setSuccess(editing ? "Gallery item updated" : "Gallery item created");
      setModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: GalleryItem) {
    if (!confirm("Delete gallery item?")) return;
    try {
      await adminApi.gallery.remove(item.id);
      setSuccess("Gallery item deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Smile Gallery"
        subtitle="Before / after cases for the public website"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add case
          </button>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No gallery cases yet"
            text="Add before-and-after smile cases to showcase treatments on the public website."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Add case
              </button>
            }
          />
        </Card>
      ) : (
        <div className="gallery-grid">
          {items.map((item) => (
            <Card
              key={item.id}
              className="gallery-card"
              title={item.treatment}
              subtitle={item.caption || "No caption"}
              actions={
                <StatusBadge
                  status={item.isPublished ? "Published" : "Draft"}
                />
              }
            >
              <div className="gallery-card__images">
                <img src={item.beforeImage} alt={`${item.treatment} before`} />
                <img src={item.afterImage} alt={`${item.treatment} after`} />
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
                  onClick={() => remove(item)}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? "Edit gallery case" : "Add gallery case"}
          onClose={() => setModal(false)}
        >
          <form className="form-grid" onSubmit={onSubmit}>
            <Field label="Treatment">
              <input
                required
                value={form.treatment}
                onChange={(e) =>
                  setForm({ ...form, treatment: e.target.value })
                }
              />
            </Field>
            <Field label="Before image URL">
              <input
                required
                type="url"
                value={form.beforeImage}
                onChange={(e) =>
                  setForm({ ...form, beforeImage: e.target.value })
                }
              />
            </Field>
            <Field label="After image URL">
              <input
                required
                type="url"
                value={form.afterImage}
                onChange={(e) =>
                  setForm({ ...form, afterImage: e.target.value })
                }
              />
            </Field>
            <Field label="Caption">
              <textarea
                rows={3}
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
              />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm({ ...form, isPublished: e.target.checked })
                }
              />
              Published
            </label>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
