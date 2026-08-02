import { useEffect, useState, type FormEvent } from "react";
import { adminApi, type Faq, type Settings } from "../lib/api";
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

export default function CmsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [faqModal, setFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    isActive: true,
  });

  async function load() {
    try {
      const [s, f] = await Promise.all([
        adminApi.settings.get(),
        adminApi.faqs.list(),
      ]);
      setSettings(s);
      setFaqs(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CMS");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.settings.update({
        clinicName: settings.clinicName,
        heroTitle: settings.heroTitle,
        heroSubtitle: settings.heroSubtitle,
        aboutContent: settings.aboutContent,
        seoTitle: settings.seoTitle,
        seoDescription: settings.seoDescription,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        mapEmbedUrl: settings.mapEmbedUrl,
      });
      setSettings(updated);
      setSuccess("Website CMS content saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openFaqCreate() {
    setEditingFaq(null);
    setFaqForm({ question: "", answer: "", isActive: true });
    setFaqModal(true);
  }

  function openFaqEdit(faq: Faq) {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      isActive: faq.isActive,
    });
    setFaqModal(true);
  }

  async function saveFaq(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingFaq) await adminApi.faqs.update(editingFaq.id, faqForm);
      else await adminApi.faqs.create(faqForm);
      setSuccess(editingFaq ? "FAQ updated" : "FAQ created");
      setFaqModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAQ save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeFaq(faq: Faq) {
    if (!confirm("Delete FAQ?")) return;
    try {
      await adminApi.faqs.remove(faq.id);
      setSuccess("FAQ deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Website CMS"
        subtitle="Edit hero, about, SEO, and FAQ content stored in PostgreSQL"
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <PageLoader />
      ) : !settings ? (
        <Card>
          <EmptyState
            title="Couldn't load CMS"
            text="Website content could not be loaded. Dismiss the error and refresh to try again."
          />
        </Card>
      ) : (
        <>
          <Card
            title="Website content"
            subtitle="Hero, about, SEO, and contact details shown on the public site"
          >
            <form className="form-grid" onSubmit={saveSettings}>
              <Field label="Clinic name">
                <input
                  value={settings.clinicName}
                  onChange={(e) =>
                    setSettings({ ...settings, clinicName: e.target.value })
                  }
                />
              </Field>
              <Field label="Hero title">
                <input
                  value={settings.heroTitle || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, heroTitle: e.target.value })
                  }
                />
              </Field>
              <Field label="Hero subtitle">
                <textarea
                  rows={3}
                  value={settings.heroSubtitle || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, heroSubtitle: e.target.value })
                  }
                />
              </Field>
              <Field label="About content">
                <textarea
                  rows={5}
                  value={settings.aboutContent || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, aboutContent: e.target.value })
                  }
                />
              </Field>
              <Field label="SEO title">
                <input
                  value={settings.seoTitle || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, seoTitle: e.target.value })
                  }
                />
              </Field>
              <Field label="SEO description">
                <textarea
                  rows={3}
                  value={settings.seoDescription || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, seoDescription: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone">
                <input
                  value={settings.phone || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                />
              </Field>
              <Field label="Email">
                <input
                  value={settings.email || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Address">
                <input
                  value={settings.address || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                />
              </Field>
              <Field label="Map embed URL">
                <input
                  value={settings.mapEmbedUrl || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, mapEmbedUrl: e.target.value })
                  }
                />
              </Field>
              <FormActions onCancel={() => void load()} saving={saving} />
            </form>
          </Card>

          <Card
            title="FAQs"
            subtitle="Questions and answers shown on the website"
            actions={
              <button
                type="button"
                className="btn btn-primary"
                onClick={openFaqCreate}
              >
                Add FAQ
              </button>
            }
          >
            {faqs.length === 0 ? (
              <EmptyState
                title="No FAQs yet"
                text="Add common questions to help patients find answers on your website."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openFaqCreate}
                  >
                    Add FAQ
                  </button>
                }
              />
            ) : (
              <div className="stack">
                {faqs.map((faq) => (
                  <article key={faq.id} className="entity-row">
                    <div>
                      <h3>{faq.question}</h3>
                      <p>{faq.answer}</p>
                      <div style={{ marginTop: "0.5rem" }}>
                        <StatusBadge
                          status={faq.isActive ? "Active" : "Inactive"}
                        />
                      </div>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openFaqEdit(faq)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeFaq(faq)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {faqModal && (
        <Modal
          title={editingFaq ? "Edit FAQ" : "Add FAQ"}
          onClose={() => setFaqModal(false)}
        >
          <form className="form-grid" onSubmit={saveFaq}>
            <Field label="Question">
              <input
                required
                value={faqForm.question}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, question: e.target.value })
                }
              />
            </Field>
            <Field label="Answer">
              <textarea
                rows={4}
                required
                value={faqForm.answer}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, answer: e.target.value })
                }
              />
            </Field>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={faqForm.isActive}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, isActive: e.target.checked })
                }
              />
              Active
            </label>
            <FormActions onCancel={() => setFaqModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
