import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useWebsite } from "../../context/WebsiteContext";
import { publicApi } from "../../lib/api";
import {
  doctorImage,
  HERO_IMAGE,
  money,
  serviceImage,
} from "../../lib/publicMedia";
import { doctorPath } from "../../lib/slug";

export default function HomePage() {
  const { data } = useWebsite();
  const settings = data?.settings;
  const services = data?.services || [];
  const doctors = data?.doctors || [];
  const testimonials = data?.testimonials || [];
  const memberships = data?.memberships || [];
  const insurance = data?.insurance || [];
  const faqs = data?.faqs || [];
  const gallery = data?.gallery || [];

  const [contactMsg, setContactMsg] = useState<string | null>(null);
  const [contactErr, setContactErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setContactMsg(null);
    setContactErr(null);
    setSending(true);
    const form = new FormData(e.currentTarget);
    try {
      await publicApi.contact({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
        subject: String(form.get("subject") || ""),
        message: String(form.get("message") || ""),
      });
      setContactMsg("Message sent. We typically respond within one business day.");
      e.currentTarget.reset();
    } catch (err) {
      setContactErr(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <img src={HERO_IMAGE} alt="" width={2000} height={1333} />
          <div className="hero-veil" />
        </div>
        <div className="container hero-shell">
          <div className="hero-content">
            <p className="eyebrow">{settings?.clinicName || "Aurelia Dental"}</p>
            <h1>{settings?.heroTitle || "Quiet luxury in modern dentistry"}</h1>
            <p className="lead">
              {settings?.heroSubtitle ||
                "A refined clinical experience with personal treatment plans, digital diagnostics, and calm, considered care."}
            </p>
            <div className="hero-actions">
              <Link className="btn btn-accent" to="/book">
                Book Appointment
              </Link>
              <Link className="btn btn-light" to="/treatments">
                Explore Treatments
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Clinic highlights">
        <div className="container">
          <div className="trust-grid">
            <article className="trust-item">
              <strong>18+</strong>
              <span>Years of clinical excellence</span>
            </article>
            <article className="trust-item">
              <strong>12k+</strong>
              <span>Happy patients cared for</span>
            </article>
            <article className="trust-item">
              <strong>25k+</strong>
              <span>Treatments completed</span>
            </article>
            <article className="trust-item">
              <strong>{doctors.length || 4}</strong>
              <span>Expert dentists</span>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="treatments">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Treatments</p>
            <h2>Precision care for every smile</h2>
            <p className="lead">
              Explore our active treatments, curated by the clinic team.
            </p>
          </div>
          {!services.length ? (
            <p className="empty-note">Treatments will appear once added in admin.</p>
          ) : (
            <div className="services-grid card-grid" data-count={services.length}>
              {services.map((service, i) => (
                <article className="service-card" key={service.id} id={`service-${service.id}`}>
                  <div className="service-card__media">
                    <img
                      src={serviceImage(service, i)}
                      alt={service.title}
                      loading="lazy"
                      width={720}
                      height={540}
                    />
                  </div>
                  <div className="service-card__body">
                    <h3>{service.title}</h3>
                    <p className="card-copy">{service.description}</p>
                    <div className="meta-row">
                      <span>{service.duration} min</span>
                      <span>From {money(service.price)}</span>
                    </div>
                    <Link className="text-link card-cta" to={`/treatments/${service.slug}`}>
                      Learn more
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-soft" id="dentists">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Dentists</p>
            <h2>Meet your clinical team</h2>
            <p className="lead">
              Experienced clinicians with transparent availability you can book online.
            </p>
          </div>
          <div className="doctors-grid card-grid" data-count={doctors.length}>
            {doctors.map((doctor, i) => (
              <article className="doctor-card" key={doctor.id}>
                <div className="doctor-media">
                  <img
                    src={doctorImage(doctor, i)}
                    alt={doctor.name}
                    loading="lazy"
                    width={640}
                    height={800}
                  />
                </div>
                <div className="doctor-card__body">
                  <h3>{doctor.name}</h3>
                  <p className="card-kicker">
                    {doctor.specialization || "General Dentistry"}
                  </p>
                  <p className="card-copy">{doctor.bio}</p>
                  <Link className="text-link card-cta" to={doctorPath(doctor)}>
                    View profile
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {gallery.length ? (
        <section className="section" id="gallery">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Smile Gallery</p>
              <h2>Before & after transformations</h2>
            </div>
            <div className="gallery-grid card-grid" data-count={gallery.length}>
              {gallery.slice(0, 6).map((item) => (
                <article className="gallery-card" key={item.id}>
                  <div className="gallery-images">
                    <figure>
                      <img src={item.beforeImage} alt="" loading="lazy" />
                      <figcaption>
                        <span>Before</span>
                      </figcaption>
                    </figure>
                    <figure>
                      <img src={item.afterImage} alt="" loading="lazy" />
                      <figcaption>
                        <span>After</span>
                      </figcaption>
                    </figure>
                  </div>
                  <h3>{item.treatment}</h3>
                  {item.caption ? <p className="card-copy">{item.caption}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {testimonials.length ? (
        <section className="section section-soft" id="testimonials">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Testimonials</p>
              <h2>Stories from our patients</h2>
            </div>
            <div className="testimonials-grid card-grid" data-count={testimonials.length}>
              {testimonials.map((t) => (
                <blockquote className="testimonial" key={t.id}>
                  <p>“{t.review}”</p>
                  <footer>
                    <strong>{t.patientName}</strong>
                    {t.rating ? <span> · {t.rating}/5</span> : null}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {memberships.length ? (
        <section className="section" id="membership">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Membership</p>
              <h2>Plans for continuous dental wellness</h2>
            </div>
            <div
              className={`membership-grid card-grid${memberships.length === 2 ? " membership-grid--duo" : ""}`}
              data-count={memberships.length}
            >
              {memberships.map((plan) => (
                <article className="plain-item" key={plan.id}>
                  <h3>{plan.name}</h3>
                  <p className="price-line">
                    {money(plan.price)} /{plan.billingCycle?.toLowerCase()}
                  </p>
                  <p className="card-copy">{plan.description}</p>
                  <Link className="text-link" to="/membership">
                    View plan details
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {insurance.length ? (
        <section className="section section-soft" id="insurance">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Insurance</p>
              <h2>Clear support for covered care</h2>
            </div>
            <div className="simple-grid card-grid" data-count={insurance.length}>
              {insurance.map((item) => (
                <article className="plain-item" key={item.id}>
                  <h3>{item.name}</h3>
                  <p className="card-copy">{item.details}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">FAQ</p>
              <h2>Common questions</h2>
            </div>
            <div className="faq-list">
              {faqs.map((faq) => (
                <details key={faq.id} className="faq-item">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="cta-band">
        <div className="container cta-inner">
          <h2>Begin your smile journey</h2>
          <p>Choose a treatment, select your dentist, and reserve a time that suits you.</p>
          <Link className="btn btn-accent" to="/book">
            Book an appointment
          </Link>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="container contact-layout">
          <div>
            <div className="section-head">
              <p className="eyebrow">Contact</p>
              <h2>Visit or send a message</h2>
              <p className="lead">
                Reach the clinic team for enquiries, treatment questions, or appointment support.
              </p>
            </div>
            <h3>Clinic details</h3>
            <p>{settings?.address}</p>
            {settings?.phone ? (
              <p>
                <a href={`tel:${String(settings.phone).replace(/\s+/g, "")}`}>
                  {settings.phone}
                </a>
              </p>
            ) : null}
            {settings?.email ? (
              <p>
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </p>
            ) : null}
          </div>
          <div className="contact-form-card">
            <h3>Send an enquiry</h3>
            <p className="card-copy">We typically respond within one business day.</p>
            {contactMsg ? <p className="form-success">{contactMsg}</p> : null}
            {contactErr ? <p className="form-error">{contactErr}</p> : null}
            <form className="form-grid-2" onSubmit={onContact}>
              <label>
                Name
                <input name="name" required placeholder="Your full name" />
              </label>
              <label>
                Email
                <input name="email" type="email" required placeholder="you@email.com" />
              </label>
              <label>
                Phone
                <input name="phone" required placeholder="+1 555 0100" />
              </label>
              <label>
                Subject
                <input name="subject" required placeholder="How can we help?" />
              </label>
              <label className="field-span">
                Message
                <textarea name="message" required rows={4} placeholder="Share a few details." />
              </label>
              <div className="field-span">
                <button className="btn btn-dark" type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
