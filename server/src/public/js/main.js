(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("#mobile-menu");
  const dropdownTrigger = document.querySelector(".dropdown-trigger");
  const dropdownItem = document.querySelector(".nav-item.has-dropdown");

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenuOpen(open) {
    if (!toggle || !mobileMenu) return;
    if (open) mobileMenu.removeAttribute("hidden");
    else mobileMenu.setAttribute("hidden", "");
    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector(".sr-only");
    if (label) label.textContent = open ? "Close menu" : "Open menu";
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle && mobileMenu) {
    toggle.addEventListener("click", () => {
      const open = mobileMenu.hasAttribute("hidden");
      setMenuOpen(open);
      if (open) mobileMenu.querySelector("a")?.focus();
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });
  }

  if (dropdownTrigger && dropdownItem) {
    dropdownTrigger.addEventListener("click", () => {
      const expanded = dropdownTrigger.getAttribute("aria-expanded") === "true";
      dropdownTrigger.setAttribute("aria-expanded", String(!expanded));
      dropdownItem.classList.toggle("is-open", !expanded);
    });

    dropdownItem.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        dropdownTrigger.setAttribute("aria-expanded", "false");
        dropdownItem.classList.remove("is-open");
        dropdownTrigger.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (!dropdownItem.contains(event.target)) {
        dropdownTrigger.setAttribute("aria-expanded", "false");
        dropdownItem.classList.remove("is-open");
      }
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }
})();
