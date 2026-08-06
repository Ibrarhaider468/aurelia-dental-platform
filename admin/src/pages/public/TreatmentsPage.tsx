import { Link } from "react-router-dom";
import { useWebsite } from "../../context/WebsiteContext";
import { money, serviceImage } from "../../lib/publicMedia";

export default function TreatmentsPage() {
  const { data } = useWebsite();
  const services = data?.services || [];

  return (
    <section className="section page-hero">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Treatments</p>
          <h1>Clinical care, thoughtfully planned</h1>
          <p className="lead">
            Browse every active treatment offered by the clinic.
          </p>
        </div>
        {!services.length ? (
          <p className="empty-note">No treatments published yet.</p>
        ) : (
          <div className="services-grid card-grid" data-count={services.length}>
            {services.map((service, i) => (
              <article className="service-card" key={service.id}>
                <div className="service-card__media">
                  <img src={serviceImage(service, i)} alt={service.title} loading="lazy" />
                </div>
                <div className="service-card__body">
                  <h2>{service.title}</h2>
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
  );
}
