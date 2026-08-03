(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const errorEl = document.getElementById("contact-error");
  const successEl = document.getElementById("contact-success");
  const submitBtn = document.getElementById("contact-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    successEl.hidden = true;

    const payload = Object.fromEntries(new FormData(form).entries());
    submitBtn.disabled = true;

    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to send message");
      }
      successEl.hidden = false;
      successEl.textContent =
        "Thank you. Your message has been received and our team will respond shortly.";
      form.reset();
    } catch (err) {
      errorEl.hidden = false;
      errorEl.textContent =
        err instanceof Error ? err.message : "Unable to send message";
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
