import { Link } from "react-router-dom";
import { useWebsite } from "../../context/WebsiteContext";
import { doctorImage } from "../../lib/publicMedia";
import { doctorPath } from "../../lib/slug";

export default function DentistsPage() {
  const { data } = useWebsite();
  const doctors = data?.doctors || [];

  return (
    <section className="section page-hero">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Dentists</p>
          <h1>Meet the clinical team</h1>
          <p className="lead">Transparent availability and specialist care.</p>
        </div>
        <div className="doctors-grid card-grid" data-count={doctors.length}>
          {doctors.map((doctor, i) => (
            <article className="doctor-card" key={doctor.id}>
              <div className="doctor-media">
                <img src={doctorImage(doctor, i)} alt={doctor.name} loading="lazy" />
              </div>
              <div className="doctor-card__body">
                <h2>{doctor.name}</h2>
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
  );
}
