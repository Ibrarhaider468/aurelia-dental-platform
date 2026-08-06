import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWebsite } from "../../context/WebsiteContext";
import { publicApi, type SlotBoardItem } from "../../lib/api";
import { money } from "../../lib/publicMedia";

const STEPS = ["Treatment", "Dentist", "Date", "Time", "Details", "Confirm"];

export default function BookPage() {
  const { data } = useWebsite();
  const [params] = useSearchParams();
  const services = data?.services || [];
  const doctors = data?.doctors || [];

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(params.get("service") || params.get("serviceId") || "");
  const [doctorId, setDoctorId] = useState(params.get("doctor") || params.get("doctorId") || "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slotBoard, setSlotBoard] = useState<SlotBoardItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  useEffect(() => {
    if (step !== 4 || !doctorId || !date) return;
    let active = true;
    setSlotsLoading(true);
    setSlot("");
    setError(null);
    void publicApi
      .slots(doctorId, date)
      .then((res) => {
        if (!active) return;
        const board =
          res.slotBoard ||
          (res.available || res.slots || []).map((time) => ({
            time,
            status: "available",
            available: true,
          }));
        setSlotBoard(board);
      })
      .catch((err) => {
        if (!active) return;
        setSlotBoard([]);
        setError(err instanceof Error ? err.message : "Could not load slots");
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step, doctorId, date]);

  function validate() {
    if (step === 1 && !serviceId) return "Please select a treatment.";
    if (step === 2 && !doctorId) return "Please select a dentist.";
    if (step === 3) {
      if (!date) return "Please choose a date.";
      if (date < today) return "Past dates cannot be booked.";
    }
    if (step === 4 && !slot) return "Please choose an available time slot.";
    if (step === 5) {
      if (patientName.trim().length < 2) return "Please enter your full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email.";
      if (phone.trim().length < 7) return "Enter a valid phone number.";
    }
    return null;
  }

  function next() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(6, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicApi.book({
        serviceId,
        doctorId,
        date,
        slot,
        patientName: patientName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim() || undefined,
      });
      setSuccess(true);
      setStep(7);
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="section page-hero">
        <div className="container booking-shell">
          <h1>Booking received</h1>
          <p className="lead">
            Your request is pending confirmation. Our team will review the details and be in touch shortly.
          </p>
          <div className="confirm-card">
            <p>
              <strong>{selectedService?.title}</strong> with {selectedDoctor?.name}
            </p>
            <p>
              {date} · {slot}
            </p>
            <p>
              {patientName} · {email} · {phone}
            </p>
          </div>
          <Link className="btn btn-dark" to="/">
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-hero">
      <div className="container booking-shell">
        <h1>Book your visit</h1>
        <p className="lead">
          A calm six-step journey from treatment choice to confirmed request.
        </p>

        <ol className="booking-steps">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <li
                key={label}
                className={`${n <= step ? "is-active" : ""} ${n === step ? "is-current" : ""}`}
              >
                {n} {label}
              </li>
            );
          })}
        </ol>

        {error ? <p className="form-error" id="booking-error">{error}</p> : null}

        <form onSubmit={onSubmit}>
          {step === 1 ? (
            <div className="booking-panel">
              <h2>Select your treatment</h2>
              <div className="option-grid">
                {services.map((service) => (
                  <label key={service.id} className={serviceId === service.id ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="serviceId"
                      checked={serviceId === service.id}
                      onChange={() => setServiceId(service.id)}
                    />
                    <strong>{service.title}</strong>
                    <em>
                      {service.duration} min · from {money(service.price)}
                    </em>
                    <small>{service.description}</small>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="booking-panel">
              <h2>Choose your dentist</h2>
              <div className="option-grid">
                {doctors.map((doctor) => (
                  <label key={doctor.id} className={doctorId === doctor.id ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="doctorId"
                      checked={doctorId === doctor.id}
                      onChange={() => setDoctorId(doctor.id)}
                    />
                    <strong>{doctor.name}</strong>
                    <em>{doctor.specialization || "General Dentistry"}</em>
                    <small>{doctor.qualification}</small>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="booking-panel">
              <h2>Select an available date</h2>
              <label>
                Preferred date
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="booking-panel">
              <h2>Choose a time slot</h2>
              {slotsLoading ? <p>Loading open slots…</p> : null}
              <div className="slot-legend" id="slot-legend">
                <span className="slot-legend__item slot-legend__item--available">Available</span>
                <span className="slot-legend__item slot-legend__item--booked">Booked</span>
                <span className="slot-legend__item slot-legend__item--past">Past</span>
              </div>
              <div className="slot-grid">
                {slotBoard.map((item) => (
                  <button
                    key={item.time}
                    type="button"
                    className={`slot-btn slot-btn--${item.status}${slot === item.time ? " is-selected" : ""}`}
                    disabled={!item.available}
                    onClick={() => setSlot(item.time)}
                  >
                    {item.time}
                  </button>
                ))}
              </div>
              {!slotsLoading && !slotBoard.length ? (
                <p className="empty-note">No slots for this date. Try another day.</p>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="booking-panel">
              <h2>Your details</h2>
              <div className="form-grid-2">
                <label>
                  Full name
                  <input value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
                </label>
                <label>
                  Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                  Phone
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </label>
                <label className="field-span">
                  Message (optional)
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                </label>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="booking-panel">
              <h2>Confirm your appointment</h2>
              <div className="confirm-card">
                <p>
                  <strong>{selectedService?.title}</strong>
                </p>
                <p>{selectedDoctor?.name}</p>
                <p>
                  {date} · {slot}
                </p>
                <p>
                  {patientName} · {email} · {phone}
                </p>
              </div>
            </div>
          ) : null}

          <div className="booking-nav">
            {step > 1 ? (
              <button type="button" className="btn btn-ghost" onClick={back}>
                Back
              </button>
            ) : null}
            {step < 6 ? (
              <button type="button" className="btn btn-dark" onClick={next}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-accent" disabled={submitting}>
                {submitting ? "Submitting…" : "Confirm booking"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
