import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <p className="footer__brand">Aurelia Dental</p>
          <p className="footer__tag">Calm care for lasting smiles.</p>
        </div>

        <nav className="footer__nav" aria-label="Footer">
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <a href="#stories">Stories</a>
          <a href="#contact">Contact</a>
        </nav>

        <p className="footer__copy">
          © {new Date().getFullYear()} Aurelia Dental. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
