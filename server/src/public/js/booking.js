(() => {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const panels = [...form.querySelectorAll("[data-step]")];
  const indicators = [...document.querySelectorAll("[data-step-indicator]")];
  const dateInput = document.getElementById("booking-date");
  const slotGrid = document.getElementById("slot-grid");
  const slotInput = document.getElementById("booking-slot");
  const slotHint = document.getElementById("slot-hint");
  const summary = document.getElementById("confirm-summary");
  const errorEl = document.getElementById("booking-error");
  const successPanel = document.getElementById("booking-success-panel");
  const successSummary = document.getElementById("booking-success-summary");
  const submitBtn = document.getElementById("booking-submit");
  const confirmActions = document.getElementById("confirm-actions");

  let step = 1;

  const preService = form.dataset.preselectService;
  const preDoctor = form.dataset.preselectDoctor;

  if (preService) {
    const el = form.querySelector(`input[name="serviceId"][value="${preService}"]`);
    if (el) el.checked = true;
  }
  if (preDoctor) {
    const el = form.querySelector(`input[name="doctorId"][value="${preDoctor}"]`);
    if (el) el.checked = true;
  }

  const today = new Date();
  dateInput.min = today.toISOString().slice(0, 10);

  function showError(message) {
    errorEl.hidden = !message;
    errorEl.textContent = message || "";
  }

  function showStep(next) {
    step = next;
    panels.forEach((panel) => {
      const key = panel.dataset.step;
      const active = key === String(step);
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    indicators.forEach((item) => {
      const n = Number(item.dataset.stepIndicator);
      item.classList.toggle("is-active", n <= step);
      item.classList.toggle("is-current", n === step);
    });
    if (step === 6) renderSummary();
    if (step === 4) void loadSlots();
  }

  function selectedRadio(name) {
    return form.querySelector(`input[name="${name}"]:checked`);
  }

  function labelFor(name) {
    const input = selectedRadio(name);
    if (!input) return "";
    return input.closest("label")?.querySelector("strong")?.textContent || "";
  }

  function validateStep() {
    if (step === 1 && !selectedRadio("serviceId")) {
      return "Please select a treatment.";
    }
    if (step === 2 && !selectedRadio("doctorId")) {
      return "Please select a dentist.";
    }
    if (step === 3) {
      if (!dateInput.value) return "Please choose a date.";
      if (dateInput.value < dateInput.min) return "Past dates cannot be booked.";
    }
    if (step === 4) {
      if (!slotInput.value) return "Please choose an available time slot.";
    }
    if (step === 5) {
      const name = form.patientName.value.trim();
      const email = form.email.value.trim();
      const phone = form.phone.value.trim();
      if (name.length < 2) return "Please enter your full name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
      if (phone.length < 7) return "Enter a valid phone number.";
    }
    return null;
  }

  async function loadSlots() {
    const doctor = selectedRadio("doctorId");
    slotGrid.innerHTML = "";
    slotInput.value = "";

    if (!doctor || !dateInput.value) {
      slotHint.textContent = "Select a dentist and date to load open slots.";
      return;
    }

    slotHint.textContent = "Loading available slots…";
    try {
      const res = await fetch(
        `/api/public/slots?doctorId=${encodeURIComponent(doctor.value)}&date=${encodeURIComponent(dateInput.value)}`,
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to load slots");
      }

      const slots = json.data.slots || [];
      if (!slots.length) {
        slotHint.textContent =
          json.data.reason ||
          "No open slots for this date. Try another working day.";
        return;
      }

      slotHint.textContent = `${slots.length} available slot${slots.length === 1 ? "" : "s"}`;
      slots.forEach((slot) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-btn";
        btn.textContent = slot;
        btn.addEventListener("click", () => {
          slotInput.value = slot;
          slotGrid
            .querySelectorAll(".slot-btn")
            .forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          showError("");
        });
        slotGrid.appendChild(btn);
      });
    } catch (err) {
      slotHint.textContent =
        err instanceof Error ? err.message : "Failed to load slots";
    }
  }

  function renderSummary() {
    summary.innerHTML = `
      <p><strong>Treatment:</strong> ${labelFor("serviceId")}</p>
      <p><strong>Dentist:</strong> ${labelFor("doctorId")}</p>
      <p><strong>Date:</strong> ${dateInput.value}</p>
      <p><strong>Time:</strong> ${slotInput.value}</p>
      <p><strong>Name:</strong> ${form.patientName.value}</p>
      <p><strong>Email:</strong> ${form.email.value}</p>
      <p><strong>Phone:</strong> ${form.phone.value}</p>
      ${
        form.message.value.trim()
          ? `<p><strong>Message:</strong> ${form.message.value.trim()}</p>`
          : ""
      }
    `;
  }

  form.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const message = validateStep();
      if (message) {
        showError(message);
        return;
      }
      showError("");
      if (btn.hasAttribute("data-load-slots")) await loadSlots();
      showStep(Math.min(6, step + 1));
    });
  });

  form.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showError("");
      showStep(Math.max(1, step - 1));
    });
  });

  dateInput.addEventListener("change", () => {
    slotInput.value = "";
    slotGrid.innerHTML = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = validateStep();
    if (message) {
      showError(message);
      return;
    }

    submitBtn.disabled = true;
    showError("");

    const payload = {
      serviceId: selectedRadio("serviceId")?.value,
      doctorId: selectedRadio("doctorId")?.value,
      date: dateInput.value,
      slot: slotInput.value,
      patientName: form.patientName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim() || null,
    };

    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Booking failed");
      }

      const appt = json.data.appointment;
      panels.forEach((panel) => {
        panel.hidden = true;
        panel.classList.remove("is-active");
      });
      successPanel.hidden = false;
      successPanel.classList.add("is-active");
      confirmActions?.setAttribute("hidden", "");
      successSummary.innerHTML = `
        <p><strong>Reference:</strong> ${appt.id}</p>
        <p><strong>Status:</strong> ${appt.status}</p>
        <p><strong>Treatment:</strong> ${appt.service?.title || labelFor("serviceId")}</p>
        <p><strong>Dentist:</strong> ${appt.doctor?.name || labelFor("doctorId")}</p>
        <p><strong>When:</strong> ${payload.date} at ${payload.slot}</p>
      `;
      indicators.forEach((item) => item.classList.add("is-active"));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Booking failed");
      submitBtn.disabled = false;
    }
  });

  showStep(1);
})();
