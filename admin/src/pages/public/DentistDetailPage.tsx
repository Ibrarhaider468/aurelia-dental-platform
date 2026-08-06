import { Link, useParams } from "react-router-dom";
import { useWebsite } from "../../context/WebsiteContext";
import { doctorImage } from "../../lib/publicMedia";
import { slugify } from "../../lib/slug";

export default function DentistDetailPage() {
  const { slug } = useParams();
  const { data } = useWebsite();
  const doctors = data?.doctors || [];
  const doctor = doctors.find((d) => slugify(d.name) === slug);
  const index = Math.max(0, doctors.findIndex((d) => d.id === doctor?.id));

  if (!doctor) {
    return (
      <section className="section container">
        <p className="empty-note">Dentist not found.</p>
        <Link className="btn btn-dark" to="/dentists">
          Back to dentists
        </Link>
      </section>
    );
  }

  const days =
    doctor.availabilities
      ?.filter((a) => a.isActive)
      .map((a) => a.day)
      .join(", ") || "Ask during booking";

  return (
    <section className="section page-hero doctor-detail-hero">
      <div className="container doctor-detail-hero__grid">
        <div className="doctor-detail-portrait">
          <img src={doctorImage(doctor, index)} alt={doctor.name} />
        </div>
        <div className="doctor-detail-intro">
          <p className="eyebrow">Dentist</p>
          <h1>{doctor.name}</h1>
          <p className="card-kicker">
            {doctor.specialization || "General Dentistry"}
          </p>
          <p className="lead">{doctor.bio}</p>
          <p>
            <strong>Available:</strong> {days}
          </p>
          <div className="detail-hero__actions">
            <Link className="btn btn-accent" to={`/book?doctorId=${doctor.id}`}>
              Book with {doctor.name.split(" ").slice(-1)[0]}
            </Link>
            <Link className="btn btn-ghost" to="/dentists">
              All dentists
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
