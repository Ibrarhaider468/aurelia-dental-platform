import { type ChangeEvent, type FormEvent, useState } from "react";
import { motion } from "framer-motion";
import "./Contact.css";

type FormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  service: "",
  message: "",
};

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!values.email.trim()) {
    errors.email = "Please enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.phone.trim()) {
    errors.phone = "Please enter a phone number.";
  } else if (!/^[\d\s()+-]{7,}$/.test(values.phone)) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!values.service) errors.service = "Select a service.";
  if (!values.message.trim()) {
    errors.message = "Tell us a little about your visit.";
  } else if (values.message.trim().length < 10) {
    errors.message = "Please add a bit more detail (10+ characters).";
  }

  return errors;
}

export default function Contact() {
  const [values, setValues] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setSubmitted(true);
      setValues(initial);
    }
  };

  return (
    <section id="contact" className="section contact">
      <div className="container contact__layout">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">Contact</p>
          <h2 className="section-title">Book your next visit</h2>
          <p className="section-lead">
            Share a few details and we’ll confirm a time that works. Prefer to
            call? Reach us at{" "}
            <a className="contact__phone" href="tel:+15550192840">
              (555) 019-2840
            </a>
            .
          </p>
          <address className="contact__address">
            214 Harbor Lane
            <br />
            Suite 120
            <br />
            Weekdays 8am–6pm · Sat 9am–1pm
          </address>
        </motion.div>

        <motion.div
          className="contact__panel"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {submitted ? (
            <div className="contact__success" role="status">
              <h3>Request received</h3>
              <p>
                Thank you—our front desk will reach out shortly to confirm your
                appointment.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSubmitted(false)}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className="contact__form" onSubmit={onSubmit} noValidate>
              <div className="contact__field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={onChange}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <span className="contact__error">{errors.name}</span>}
              </div>

              <div className="contact__row">
                <div className="contact__field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={onChange}
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && (
                    <span className="contact__error">{errors.email}</span>
                  )}
                </div>

                <div className="contact__field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={values.phone}
                    onChange={onChange}
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && (
                    <span className="contact__error">{errors.phone}</span>
                  )}
                </div>
              </div>

              <div className="contact__field">
                <label htmlFor="service">Service interest</label>
                <select
                  id="service"
                  name="service"
                  value={values.service}
                  onChange={onChange}
                  aria-invalid={Boolean(errors.service)}
                >
                  <option value="">Select one</option>
                  <option value="cleaning">Cleaning & exam</option>
                  <option value="cosmetic">Cosmetic care</option>
                  <option value="restorative">Restorative care</option>
                  <option value="family">Family / kids</option>
                  <option value="emergency">Emergency</option>
                  <option value="aligners">Invisalign</option>
                </select>
                {errors.service && (
                  <span className="contact__error">{errors.service}</span>
                )}
              </div>

              <div className="contact__field">
                <label htmlFor="message">How can we help?</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={values.message}
                  onChange={onChange}
                  aria-invalid={Boolean(errors.message)}
                />
                {errors.message && (
                  <span className="contact__error">{errors.message}</span>
                )}
              </div>

              <button type="submit" className="btn btn-primary contact__submit">
                Request appointment
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
