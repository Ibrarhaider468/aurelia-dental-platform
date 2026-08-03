import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { adminApi, type ContactMessage } from "../lib/api";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  PageLoader,
  SearchInput,
  StatusBadge,
  SuccessBanner,
  Toolbar,
  formatDate,
} from "../components/ui";

const STATUSES = ["NEW", "READ", "REPLIED"] as const;

export default function ContactMessagesPage() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  async function load() {
    try {
      const rows = await adminApi.contactMessages.list({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setItems(rows);
      if (selected) {
        setSelected(rows.find((row) => row.id === selected.id) || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void load();
  }, [search, statusFilter]);

  async function setStatus(message: ContactMessage, status: string) {
    try {
      await adminApi.contactMessages.updateStatus(message.id, status);
      setSuccess(`Marked as ${status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function openMessage(message: ContactMessage) {
    setSelected(message);
    if (message.status === "NEW") {
      try {
        const updated = await adminApi.contactMessages.updateStatus(
          message.id,
          "READ",
        );
        setSelected(updated);
        setItems((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row)),
        );
      } catch {
        // Keep selected message even if auto-read fails.
      }
    }
  }

  async function remove(message: ContactMessage) {
    if (!confirm("Delete this contact message?")) return;
    try {
      await adminApi.contactMessages.remove(message.id);
      setSuccess("Message deleted");
      if (selected?.id === message.id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Contact Messages"
        subtitle="Enquiries submitted from the public website contact form"
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
              placeholder="Search name, email, subject, message"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Toolbar>

          <div className="split-layout">
            <Card
              flush
              title="Inbox"
              subtitle={`${items.length} message${items.length === 1 ? "" : "s"}`}
            >
              {items.length === 0 ? (
                <EmptyState
                  title="No messages found"
                  text="Contact form submissions will appear here."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((message) => (
                        <tr key={message.id}>
                          <td>
                            <div className="cell-title">{message.name}</div>
                            <div className="cell-sub">{message.email}</div>
                          </td>
                          <td>{message.subject}</td>
                          <td>
                            <StatusBadge status={message.status} />
                          </td>
                          <td>
                            {formatDate(message.createdAt)}
                            <div className="cell-sub">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="row-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => void openMessage(message)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card
              title="Message detail"
              subtitle={selected ? selected.subject : "Select a message"}
            >
              {!selected ? (
                <EmptyState
                  title="Nothing selected"
                  text="Choose a message from the inbox to read the full enquiry."
                />
              ) : (
                <div className="stack">
                  <div>
                    <div className="cell-title">{selected.name}</div>
                    <div className="cell-sub">{selected.email}</div>
                    <div className="cell-sub">{selected.phone}</div>
                  </div>
                  <div>
                    <StatusBadge status={selected.status} />
                    <div className="cell-sub" style={{ marginTop: "0.45rem" }}>
                      Submitted {new Date(selected.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <strong>Subject</strong>
                    <p className="muted">{selected.subject}</p>
                  </div>
                  <div>
                    <strong>Message</strong>
                    <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                      {selected.message}
                    </p>
                  </div>
                  <div className="row-actions">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`btn btn-sm ${
                          selected.status === status ? "btn-primary" : "btn-ghost"
                        }`}
                        onClick={() => void setStatus(selected, status)}
                        disabled={selected.status === status}
                      >
                        {status}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => void remove(selected)}
                    >
                      Delete
                    </button>
                  </div>
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  >
                    <Mail size={14} />
                    Reply by email
                  </a>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
