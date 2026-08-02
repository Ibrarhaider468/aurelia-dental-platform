import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import "./Header.css";

const links = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#stories", label: "Stories" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
      <div className="container header__inner">
        <a href="#top" className="header__brand" onClick={close}>
          <span className="header__mark" aria-hidden="true" />
          Aurelia Dental
        </a>

        <nav className="header__nav" aria-label="Primary">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="header__link">
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className="btn btn-primary header__cta">
          Book visit
        </a>

        <button
          type="button"
          className="header__toggle"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`header__drawer ${open ? "header__drawer--open" : ""}`}
      >
        <nav className="header__drawer-nav" aria-label="Mobile">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="header__drawer-link"
              onClick={close}
            >
              {link.label}
            </a>
          ))}
          <a href="#contact" className="btn btn-primary" onClick={close}>
            Book visit
          </a>
        </nav>
      </div>
    </header>
  );
}
