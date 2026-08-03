import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adminApi, type AdminUser, type Doctor } from "../lib/api";
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
import { roleLabel } from "../lib/permissions";

const ROLES = ["SUPER_ADMIN", "STAFF", "FINANCE_MANAGER", "DOCTOR"] as const;

const empty = {
  name: "",
  email: "",
  password: "",
  role: "STAFF" as (typeof ROLES)[number],
  isActive: true,
  doctorId: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [userRows, doctorRows] = await Promise.all([
        adminApi.users.list(),
        adminApi.doctors.list(),
      ]);
      setUsers(userRows);
      setDoctors(doctorRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
        doctorId: form.role === "DOCTOR" ? form.doctorId || null : null,
        ...(form.password ? { password: form.password } : {}),
      };

      if (modal === "create") {
        if (!form.password) throw new Error("Password is required");
        await adminApi.users.create({ ...payload, password: form.password });
        setSuccess("User created");
      } else if (selected) {
        await adminApi.users.update(selected.id, payload);
        setSuccess("User updated");
      }
      setModal(null);
      setSelected(null);
      setForm(empty);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(user: AdminUser) {
    if (!confirm(`Delete ${user.email}?`)) return;
    try {
      await adminApi.users.remove(user.id);
      setSuccess("User deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle="Manage admin roles and clinic access"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setForm(empty);
              setSelected(null);
              setModal("create");
            }}
          >
            Add user
          </button>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users"
        />
      </Toolbar>

      {loading ? (
        <PageLoader />
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState
              title="No users found"
              text="Create staff, finance, or doctor accounts for role-based access."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Doctor link</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{roleLabel(user.role)}</td>
                      <td>{user.doctor?.name || "—"}</td>
                      <td>
                        <StatusBadge
                          status={user.isActive ? "active" : "cancelled"}
                        />
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            setSelected(user);
                            setForm({
                              name: user.name,
                              email: user.email,
                              password: "",
                              role: user.role as (typeof ROLES)[number],
                              isActive: user.isActive,
                              doctorId: user.doctorId || "",
                            });
                            setModal("edit");
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void onDelete(user)}
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
      )}

      {modal ? (
        <Modal
          title={modal === "create" ? "Add user" : "Edit user"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={onSubmit} className="form-grid">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field
              label={modal === "create" ? "Password" : "Password (optional)"}
            >
              <input
                type="password"
                required={modal === "create"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as (typeof ROLES)[number],
                  })
                }
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </Field>
            {form.role === "DOCTOR" ? (
              <Field label="Linked doctor profile">
                <select
                  required
                  value={form.doctorId}
                  onChange={(e) =>
                    setForm({ ...form, doctorId: e.target.value })
                  }
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Active">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                Account can sign in
              </label>
            </Field>
            <FormActions onCancel={() => setModal(null)} saving={saving} />
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
