import { useEffect, useState, type FormEvent } from "react";
import { adminApi, type Settings } from "../lib/api";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  FormActions,
  PageHeader,
  PageLoader,
  SuccessBanner,
} from "../components/ui";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hours, setHours] = useState<Record<string, string>>({});
  const [social, setSocial] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.settings
      .get()
      .then((data) => {
        setSettings(data);
        setHours((data.openingHours as Record<string, string>) || {});
        setSocial((data.socialLinks as Record<string, string>) || {});
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load settings"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.settings.update({
        clinicName: settings.clinicName,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        logo: settings.logo,
        openingHours: hours,
        socialLinks: social,
      });
      setSettings(updated);
      setSuccess("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Clinic details, hours, logo, and social links"
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <PageLoader />
      ) : !settings ? (
        <Card>
          <EmptyState
            title="Couldn't load settings"
            text="Clinic settings could not be loaded. Dismiss the error and refresh to try again."
          />
        </Card>
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          <Card
            title="Clinic details"
            subtitle="Name, logo, and contact information"
          >
            <div className="form-grid">
              <Field label="Clinic name">
                <input
                  value={settings.clinicName}
                  onChange={(e) =>
                    setSettings({ ...settings, clinicName: e.target.value })
                  }
                />
              </Field>
              <Field label="Logo URL">
                <input
                  value={settings.logo || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, logo: e.target.value })
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
            </div>
          </Card>

          <Card
            title="Opening hours"
            subtitle="Weekly schedule shown on the website and booking pages"
          >
            <div className="form-grid">
              {DAYS.map((day) => (
                <Field key={day} label={day}>
                  <input
                    value={hours[day] || ""}
                    onChange={(e) =>
                      setHours({ ...hours, [day]: e.target.value })
                    }
                    placeholder="09:00-17:00 or Closed"
                  />
                </Field>
              ))}
            </div>
          </Card>

          <Card
            title="Social links"
            subtitle="Profile URLs linked from the public site footer"
          >
            <div className="form-grid">
              {["instagram", "facebook", "linkedin"].map((key) => (
                <Field key={key} label={key}>
                  <input
                    value={social[key] || ""}
                    onChange={(e) =>
                      setSocial({ ...social, [key]: e.target.value })
                    }
                  />
                </Field>
              ))}
              <FormActions
                onCancel={() => window.location.reload()}
                saving={saving}
              />
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
