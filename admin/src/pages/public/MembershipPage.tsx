import { useState, type FormEvent } from "react";
import { useWebsite } from "../../context/WebsiteContext";
import { publicApi } from "../../lib/api";
import { money } from "../../lib/publicMedia";

export default function MembershipPage() {
  const { data } = useWebsite();
  const plans = data?.memberships || [];
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      await publicApi.subscribe({
        planId: String(form.get("planId") || ""),
        patientName: String(form.get("patientName") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
      });
      setMessage("Subscription request received. Our team will confirm shortly.");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section page-hero">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Membership</p>
          <h1>Plans for continuous dental wellness</h1>
          <p className="lead">
            Membership options designed for prevention, priority access, and lasting oral health.
          </p>
        </div>

        <div
          className={`membership-grid card-grid${plans.length === 2 ? " membership-grid--duo" : ""}`}
          data-count={plans.length}
        >
          {plans.map((plan) => (
            <article className="plain-item" key={plan.id}>
              <h2>{plan.name}</h2>
              <p className="price-line">
                {money(plan.price)} /{String(plan.billingCycle || "").toLowerCase()}
              </p>
              <p className="card-copy">{plan.description}</p>
              {Array.isArray(plan.benefits) ? (
                <ul>
                  {plan.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <div className="contact-form-card" style={{ marginTop: "2.5rem", maxWidth: 560 }}>
          <h2>Request a membership</h2>
          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <form onSubmit={onSubscribe}>
            <label>
              Plan
              <select name="planId" required defaultValue="">
                <option value="" disabled>
                  Select a plan
                </option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Full name
              <input name="patientName" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Phone
              <input name="phone" required />
            </label>
            <button className="btn btn-dark" type="submit" disabled={saving || !plans.length}>
              {saving ? "Submitting…" : "Request membership"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
