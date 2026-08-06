import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useWebsite } from "../context/WebsiteContext";
import "../styles/public.css";

export default function PublicLayout() {
  const { data, loading, error } = useWebsite();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const settings = data?.settings;
  const services = data?.services || [];
  const clinic = settings?.clinicName || "Aurelia Dental";

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.classList.add("public-body");
    document.title = settings?.seoTitle || `${clinic} | Premium Dental Clinic`;
    return () => {
      document.body.classList.remove("public-body");
    };
  }, [clinic, settings?.seoTitle]);

  const whatsapp = String(settings?.whatsappNumber || "").replace(/\D/g, "");

  return (
    <div className="public-site">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header" id="top">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label={`${clinic} home`}>
            <span className="brand-mark" aria-hidden="true" />
            <span>{clinic}</span>
          </Link>

          <nav className="nav-desktop" aria-label="Primary">
            <div className="nav-item has-dropdown">
              <NavLink className="nav-link" to="/treatments">
                Treatments
              </NavLink>
              <div className="dropdown" role="menu">
                {services.slice(0, 10).map((service) => (
                  <Link key={service.id} to={`/treatments/${service.slug}`} role="menuitem">
                    {service.title}
                  </Link>
                ))}
                <Link to="/treatments" className="dropdown-all" role="menuitem">
                  All treatments
                </Link>
              </div>
            </div>
            <NavLink className="nav-link" to="/dentists">
              Dentists
            </NavLink>
            <NavLink className="nav-link" to="/membership">
              Membership
            </NavLink>
            <NavLink className="nav-link" to="/insurance">
              Insurance
            </NavLink>
            <NavLink className="nav-link" to="/payments">
              Payments
            </NavLink>
            <Link className="nav-link" to="/#contact">
              Contact
            </Link>
          </nav>

          <Link className="btn btn-dark header-cta" to="/book">
            Book Appointment
          </Link>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>

        <nav
          className="mobile-menu"
          id="mobile-menu"
          hidden={!menuOpen}
          aria-label="Mobile"
        >
          <Link to="/treatments">Treatments</Link>
          <Link to="/dentists">Dentists</Link>
          <Link to="/membership">Membership</Link>
          <Link to="/insurance">Insurance</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/#contact">Contact</Link>
          <Link className="btn btn-dark" to="/book">
            Book Appointment
          </Link>
        </nav>
      </header>

      <main id="main-content">
        {loading && !data ? (
          <div className="section container">
            <p className="empty-note">Loading clinic…</p>
          </div>
        ) : null}
        {error && !data?.services?.length ? (
          <div className="section container">
            <p className="empty-note">{error}</p>
          </div>
        ) : null}
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <p className="footer-brand">{clinic}</p>
            <p className="footer-tag">
              Premium dentistry with quiet confidence — personal care plans,
              digital precision, and calm clinical spaces.
            </p>
          </div>
          <div>
            <h2 className="footer-heading">Explore</h2>
            <div className="footer-links">
              <Link to="/treatments">Treatments</Link>
              <Link to="/dentists">Dentists</Link>
              <Link to="/membership">Membership</Link>
              <Link to="/insurance">Insurance</Link>
              <Link to="/payments">Payments</Link>
              <Link to="/book">Book</Link>
            </div>
          </div>
          <div>
            <h2 className="footer-heading">Services</h2>
            <div className="footer-links">
              {services.slice(0, 6).map((s) => (
                <Link key={s.id} to={`/treatments/${s.slug}`}>
                  {s.title}
                </Link>
              ))}
              {!services.length ? <Link to="/treatments">View all treatments</Link> : null}
            </div>
          </div>
          <div>
            <h2 className="footer-heading">Contact</h2>
            <p>{settings?.address || "214 Harbor Lane, Suite 120"}</p>
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
            <p style={{ marginTop: "1rem" }}>
              <Link className="btn btn-accent" to="/book">
                Book Appointment
              </Link>
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>
            © {new Date().getFullYear()} {clinic}. All rights reserved.
          </p>
          <p className="footer-credit">
            Developed by <span>Ibrar Haider</span>
          </p>
          <p>
            <Link to="/#faq">FAQ</Link> · <Link to="/#contact">Visit</Link> ·{" "}
            <Link to="/admin/login">Admin</Link>
          </p>
        </div>
      </footer>

      {whatsapp ? (
        <a
          className="whatsapp-float"
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
        >
          <span className="whatsapp-float__label">WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
