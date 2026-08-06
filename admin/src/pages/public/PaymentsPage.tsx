import { useWebsite } from "../../context/WebsiteContext";

export default function PaymentsPublicPage() {
  const { data } = useWebsite();
  const methods = data?.paymentOptions?.methods || [];

  return (
    <section className="section page-hero">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Payments</p>
          <h1>Flexible ways to invest in your smile</h1>
          <p className="lead">
            Transparent payment options for consultations and treatment plans.
          </p>
        </div>
        <div className="simple-grid card-grid" data-count={Math.max(methods.length, 1)}>
          {methods.length ? (
            methods.map((method) => (
              <article className="plain-item" key={method.code}>
                <h2>{method.label}</h2>
                <p className="card-copy">
                  Available for eligible clinic payments in{" "}
                  {data?.paymentOptions?.currency || "USD"}.
                </p>
              </article>
            ))
          ) : (
            <article className="plain-item">
              <h2>Clinic payment options</h2>
              <p className="card-copy">
                Card, bank transfer, and financing options can be confirmed during your consultation.
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
