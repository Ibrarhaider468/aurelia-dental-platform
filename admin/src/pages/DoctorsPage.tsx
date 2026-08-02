import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adminApi, type Availability, type Doctor } from "../lib/api";
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
} from "../components/ui";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const emptyDoctor = {
  name: "",
  qualification: "",
  experience: "",
  specialization: "",
  bio: "",
  image: "",
  isActive: true,
};

const emptyAvailability = {
  day: "MONDAY",
  startTime: "09:00",
  endTime: "17:00",
  breakStart: "13:00",
  breakEnd: "14:00",
  slotMinutes: 30,
  isActive: true,
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | "availability" | null>(
    null,
  );
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [form, setForm] = useState(emptyDoctor);
  const [availability, setAvailability] = useState(emptyAvailability);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setDoctors(await adminApi.doctors.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.specialization || "").toLowerCase().includes(q) ||
        (d.qualification || "").toLowerCase().includes(q),
    );
  }, [doctors, search]);

  function openCreate() {
    setSelected(null);
    setForm(emptyDoctor);
    setModal("create");
  }

  function openEdit(doctor: Doctor) {
    setSelected(doctor);
    setForm({
      name: doctor.name,
      qualification: doctor.qualification || "",
      experience: doctor.experience?.toString() || "",
      specialization: doctor.specialization || "",
      bio: doctor.bio || "",
      image: doctor.image || "",
      isActive: doctor.isActive,
    });
    setModal("edit");
  }

  function openAvailability(doctor: Doctor) {
    setSelected(doctor);
    setAvailability(emptyAvailability);
    setModal("availability");
  }

  async function saveDoctor(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: form.name,
        qualification: form.qualification || null,
        experience: form.experience ? Number(form.experience) : null,
        specialization: form.specialization || null,
        bio: form.bio || null,
        image: form.image || null,
        isActive: form.isActive,
      };
      if (modal === "edit" && selected) {
        await adminApi.doctors.update(selected.id, payload);
        setSuccess("Doctor updated");
      } else {
        await adminApi.doctors.create(payload);
        setSuccess("Doctor created");
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailability(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.doctors.saveAvailability(selected.id, {
        ...availability,
        breakStart: availability.breakStart || null,
        breakEnd: availability.breakEnd || null,
      });
      setSuccess("Availability saved");
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Availability save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeDoctor(doctor: Doctor) {
    if (!confirm(`Delete ${doctor.name}?`)) return;
    try {
      await adminApi.doctors.remove(doctor.id);
      setSuccess("Doctor deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function removeAvailability(doctor: Doctor, row: Availability) {
    if (!confirm(`Remove ${row.day} schedule?`)) return;
    try {
      await adminApi.doctors.deleteAvailability(doctor.id, row.id);
      setSuccess("Availability removed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Doctors"
        subtitle="Manage dentist profiles and weekly availability"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add doctor
          </button>
        }
      />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {loading && doctors.length === 0 ? (
        <PageLoader />
      ) : (
        <>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search doctors…"
            />
          </Toolbar>

          <Card
            title="Dentists"
            subtitle={`${filtered.length} of ${doctors.length} doctors`}
          >
            {filtered.length === 0 ? (
              <EmptyState
                title={doctors.length === 0 ? "No doctors yet" : "No matches"}
                text={
                  doctors.length === 0
                    ? "Add your first dentist profile and set weekly availability."
                    : "Try a different search term."
                }
                action={
                  doctors.length === 0 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openCreate}
                    >
                      Add doctor
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="stack">
                {filtered.map((doctor) => (
                  <article key={doctor.id} className="entity-row">
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <h3 className="cell-title" style={{ margin: 0 }}>
                          {doctor.name}
                        </h3>
                        <StatusBadge
                          status={doctor.isActive ? "Active" : "Inactive"}
                        />
                      </div>
                      <p className="cell-sub">
                        {doctor.specialization || "General"} ·{" "}
                        {doctor.qualification || "—"} ·{" "}
                        {doctor.experience ?? 0} yrs
                      </p>
                      {doctor.availabilities &&
                      doctor.availabilities.length > 0 ? (
                        <ul className="chip-list">
                          {doctor.availabilities.map((a) => (
                            <li key={a.id}>
                              <span>
                                {a.day}: {a.startTime}-{a.endTime}
                              </span>
                              <button
                                type="button"
                                className="linkish"
                                onClick={() => removeAvailability(doctor, a)}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="cell-sub">No availability set.</p>
                      )}
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openAvailability(doctor)}
                      >
                        Availability
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => openEdit(doctor)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeDoctor(doctor)}
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

      {(modal === "create" || modal === "edit") && (
        <Modal
          title={modal === "edit" ? "Edit doctor" : "Add doctor"}
          onClose={() => setModal(null)}
        >
          <form className="form-grid" onSubmit={saveDoctor}>
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Specialization">
              <input
                value={form.specialization}
                onChange={(e) =>
                  setForm({ ...form, specialization: e.target.value })
                }
              />
            </Field>
            <Field label="Qualification">
              <input
                value={form.qualification}
                onChange={(e) =>
                  setForm({ ...form, qualification: e.target.value })
                }
              />
            </Field>
            <Field label="Experience (years)">
              <input
                type="number"
                min={0}
                value={form.experience}
                onChange={(e) =>
                  setForm({ ...form, experience: e.target.value })
                }
              />
            </Field>
            <Field label="Image URL">
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </Field>
            <Field label="Biography">
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
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
            <FormActions onCancel={() => setModal(null)} saving={saving} />
          </form>
        </Modal>
      )}

      {modal === "availability" && selected && (
        <Modal
          title={`Availability — ${selected.name}`}
          onClose={() => setModal(null)}
        >
          <form className="form-grid" onSubmit={saveAvailability}>
            <Field label="Day">
              <select
                value={availability.day}
                onChange={(e) =>
                  setAvailability({ ...availability, day: e.target.value })
                }
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start time">
              <input
                type="time"
                required
                value={availability.startTime}
                onChange={(e) =>
                  setAvailability({ ...availability, startTime: e.target.value })
                }
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                required
                value={availability.endTime}
                onChange={(e) =>
                  setAvailability({ ...availability, endTime: e.target.value })
                }
              />
            </Field>
            <Field label="Break start">
              <input
                type="time"
                value={availability.breakStart}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    breakStart: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Break end">
              <input
                type="time"
                value={availability.breakEnd}
                onChange={(e) =>
                  setAvailability({ ...availability, breakEnd: e.target.value })
                }
              />
            </Field>
            <Field label="Slot minutes">
              <input
                type="number"
                min={5}
                value={availability.slotMinutes}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    slotMinutes: Number(e.target.value),
                  })
                }
              />
            </Field>
            <FormActions onCancel={() => setModal(null)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
