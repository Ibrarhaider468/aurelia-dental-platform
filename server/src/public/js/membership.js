(() => {
  const panel = document.getElementById("membership-form-panel");
  const form = document.getElementById("membership-subscribe-form");
  const planIdInput = document.getElementById("subscribe-plan-id");
  const planName = document.getElementById("selected-plan-name");
  const errorEl = document.getElementById("membership-error");
  const successEl = document.getElementById("membership-success");

  if (!form || !panel) return;

  document.querySelectorAll(".membership-subscribe").forEach((btn) => {
    btn.addEventListener("click", () => {
      planIdInput.value = btn.dataset.planId || "";
      planName.textContent = btn.dataset.planName || "";
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      form.querySelector('input[name="patientName"]')?.focus();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    successEl.hidden = true;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/public/memberships/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Subscription failed");
      }
      successEl.hidden = false;
      successEl.textContent =
        "Subscription request received as PENDING with a linked membership payment record.";
      form.reset();
    } catch (err) {
      errorEl.hidden = false;
      errorEl.textContent =
        err instanceof Error ? err.message : "Subscription failed";
    }
  });
})();
