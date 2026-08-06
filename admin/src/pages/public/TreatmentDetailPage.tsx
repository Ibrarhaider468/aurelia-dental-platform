import { Link, useParams } from "react-router-dom";
import { useWebsite } from "../../context/WebsiteContext";
import { money, serviceImage } from "../../lib/publicMedia";

export default function TreatmentDetailPage() {
  const { slug } = useParams();
  const { data } = useWebsite();
  const services = data?.services || [];
  const service = services.find((s) => s.slug === slug);
  const index = Math.max(0, services.findIndex((s) => s.id === service?.id));

  if (!service) {
    return (
      <section className="section container">
        <p className="empty-note">Treatment not found.</p>
        <Link className="btn btn-dark" to="/treatments">
          Back to treatments
        </Link>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container detail-layout">
        <div className="treatment-item">
          <div className="treatment-media">
            <img src={serviceImage(service, index)} alt={service.title} />
          </div>
          <div className="treatment-body">
            <p className="eyebrow">Treatment</p>
            <h1>{service.title}</h1>
            <p className="lead">{service.description}</p>
            <div className="meta-row">
              <span>{service.duration} min</span>
              <span>From {money(service.price)}</span>
            </div>
            <div className="treatment-actions">
              <Link className="btn btn-accent" to={`/book?service=${service.id}`}>
                Book this treatment
              </Link>
              <Link className="btn btn-ghost" to="/treatments">
                All treatments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
