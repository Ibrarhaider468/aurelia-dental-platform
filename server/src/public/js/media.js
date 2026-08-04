(() => {
  function applyFallback(img) {
    if (!img || img.dataset.fallbackApplied === "1") return;
    const fallback = img.getAttribute("data-fallback");
    if (!fallback || img.src === fallback) {
      img.classList.add("is-broken");
      return;
    }
    img.dataset.fallbackApplied = "1";
    img.src = fallback;
  }

  document.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target && target.tagName === "IMG" && target.hasAttribute("data-fallback")) {
        applyFallback(target);
      }
    },
    true,
  );

  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) applyFallback(img);
  });
})();
