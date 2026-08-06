import { useWebsite } from "../../context/WebsiteContext";

export default function InsurancePage() {
  const { data } = useWebsite();
  const insurance = data?.insurance || [];

  return (
    <section className="section page-hero">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Insurance</p>
          <h1>Clear support for covered care</h1>
          <p className="lead">
            We work with major dental insurers and help verify your benefits before treatment begins.
          </p>
        </div>
        <div className="simple-grid card-grid" data-count={insurance.length}>
          {insurance.map((item) => (
            <article className="plain-item" key={item.id}>
              <h2>{item.name}</h2>
              <p className="card-copy">{item.details}</p>
              {item.acceptedPlans?.length ? (
                <p>
                  <strong>Accepted plans:</strong> {item.acceptedPlans.join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
