/**
 * Phase 4 — full platform verification
 * Covers: public site, roles, booking, availability, appointments, payments, DB-backed features
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:4000";
const API = `${BASE}/api`;
const prisma = new PrismaClient();

const results = [];
let failures = 0;

function ok(section, name, detail = "") {
  results.push({ section, name, pass: true, detail });
  console.log(`  OK   ${section} · ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(section, name, detail = "") {
  failures += 1;
  results.push({ section, name, pass: false, detail });
  console.log(`  FAIL ${section} · ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  return { res, text };
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, status: res.status };
}

async function login(email, password) {
  const { res, json, status } = await api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!res.ok || !json.success) {
    throw new Error(`${email}: ${json.message || status}`);
  }
  return json.data;
}

function nextWeekdayIso(dayName) {
  const map = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const target = map[dayName];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 1; i <= 14; i += 1) {
    const candidate = new Date(d);
    candidate.setDate(d.getDate() + i);
    if (candidate.getDay() === target) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return null;
}

async function sectionPublicSite() {
  console.log("\n[1] Public website");
  const pages = [
    "/",
    "/book",
    "/treatments",
    "/dentists",
    "/membership",
    "/insurance",
    "/payments",
  ];
  for (const path of pages) {
    const { res, text } = await fetchText(path);
    if (res.status === 200 && text.includes("</html>")) {
      ok("public", path, `status ${res.status}`);
    } else {
      fail("public", path, `status ${res.status}`);
    }
  }

  const home = await fetchText("/");
  if (home.text.includes("whatsapp-float") && home.text.includes("wa.me/")) {
    ok("public", "whatsapp float");
  } else if (home.text.includes("whatsapp-float")) {
    fail("public", "whatsapp float", "button present but wa.me href missing");
  } else {
    // number may be unset — check settings
    const settings = await prisma.settings.findUnique({ where: { id: "clinic" } });
    if (!settings?.whatsappNumber) {
      ok("public", "whatsapp float", "hidden (no number configured)");
    } else {
      fail("public", "whatsapp float", "number set but button missing");
    }
  }

  const health = await api("/health");
  if (health.status === 200 && health.json.success !== false) {
    ok("public", "health", JSON.stringify(health.json.data || health.json).slice(0, 80));
  } else {
    fail("public", "health", String(health.status));
  }

  const website = await api("/public/website");
  if (website.status === 200 && website.json.data?.settings) {
    ok("public", "website bundle");
  } else {
    fail("public", "website bundle", website.json.message || String(website.status));
  }
}

async function sectionRoles() {
  console.log("\n[2] Admin login · every role");
  const accounts = [
    ["SUPER_ADMIN", "admin@aureliadental.com", "Admin123!"],
    ["STAFF", "staff@aureliadental.com", "Staff123!"],
    ["FINANCE_MANAGER", "finance@aureliadental.com", "Finance123!"],
    ["DOCTOR", "doctor@aureliadental.com", "Doctor123!"],
  ];

  const matrix = {
    SUPER_ADMIN: {
      allow: ["/admin/dashboard", "/admin/payments", "/admin/users", "/admin/settings"],
      deny: [],
    },
    STAFF: {
      allow: ["/admin/appointments", "/admin/patients", "/admin/services", "/admin/holidays"],
      deny: ["/admin/payments", "/admin/settings", "/admin/users"],
    },
    FINANCE_MANAGER: {
      allow: ["/admin/payments", "/admin/finance", "/admin/memberships", "/admin/insurance"],
      deny: ["/admin/appointments", "/admin/settings", "/admin/users"],
    },
    DOCTOR: {
      allow: ["/admin/appointments", "/admin/patients", "/admin/dashboard"],
      deny: ["/admin/payments", "/admin/finance", "/admin/users", "/admin/settings"],
    },
  };

  const tokens = {};
  for (const [role, email, password] of accounts) {
    try {
      const data = await login(email, password);
      tokens[role] = data;
      if (data.user.role === role) {
        ok("roles", `${role} login`, data.user.email);
      } else {
        fail("roles", `${role} login`, `got role ${data.user.role}`);
      }
      if (role === "DOCTOR" && !data.user.doctorId) {
        fail("roles", "DOCTOR linked profile", "doctorId missing");
      } else if (role === "DOCTOR") {
        ok("roles", "DOCTOR linked profile", data.user.doctorId);
      }
    } catch (error) {
      fail("roles", `${role} login`, error.message);
    }
  }

  for (const [role, rules] of Object.entries(matrix)) {
    const token = tokens[role]?.token;
    if (!token) continue;
    for (const path of rules.allow) {
      const { status } = await api(path, { token });
      if (status === 200) ok("roles", `${role} allow ${path}`);
      else fail("roles", `${role} allow ${path}`, `status ${status}`);
    }
    for (const path of rules.deny) {
      const { status } = await api(path, { token });
      if (status === 403) ok("roles", `${role} deny ${path}`);
      else fail("roles", `${role} deny ${path}`, `status ${status}`);
    }
  }

  return tokens;
}

async function sectionBookingAndAvailability(tokens) {
  console.log("\n[3] Booking · doctor availability · appointments");

  const doctors = await api("/public/doctors");
  const services = await api("/public/services");
  if (doctors.status !== 200 || !doctors.json.data?.length) {
    fail("booking", "public doctors", doctors.json.message || "empty");
    return null;
  }
  if (services.status !== 200 || !services.json.data?.length) {
    fail("booking", "public services", services.json.message || "empty");
    return null;
  }
  ok("booking", "public doctors", `${doctors.json.data.length} doctors`);
  ok("booking", "public services", `${services.json.data.length} services`);

  const doctor =
    doctors.json.data.find((d) => d.name?.includes("Elena")) ||
    doctors.json.data[0];
  const service = services.json.data[0];

  const days = await api(`/public/doctors/${doctor.id}/days`);
  const dayList = days.json.data?.days || days.json.data || [];
  if (days.status !== 200 || !Array.isArray(dayList) || !dayList.length) {
    fail("availability", "doctor days", days.json.message || "no days");
    return null;
  }
  ok("availability", "doctor days", dayList.join(", "));

  const date = nextWeekdayIso(dayList[0]);
  const slots = await api(
    `/public/slots?doctorId=${encodeURIComponent(doctor.id)}&date=${date}`,
  );
  const slotList = slots.json.data?.slots || slots.json.data || [];
  if (slots.status !== 200 || !Array.isArray(slotList) || !slotList.length) {
    fail("availability", "open slots", `${date}: ${slots.json.message || "none"}`);
    return null;
  }
  ok("availability", "open slots", `${date} → ${slotList.length} slots`);

  // Doctor updates own availability (idempotent upsert)
  const doctorToken = tokens.DOCTOR?.token;
  if (doctorToken && tokens.DOCTOR.user.doctorId) {
    const ownId = tokens.DOCTOR.user.doctorId;
    const avail = await api(`/admin/doctors/${ownId}/availability`, {
      method: "PUT",
      token: doctorToken,
      body: {
        day: dayList[0],
        startTime: "09:00",
        endTime: "17:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        slotMinutes: 30,
        isActive: true,
      },
    });
    if (avail.status === 200) ok("availability", "doctor upsert own hours");
    else fail("availability", "doctor upsert own hours", avail.json.message || String(avail.status));

    const other = doctors.json.data.find((d) => d.id !== ownId);
    if (other) {
      const blocked = await api(`/admin/doctors/${other.id}/availability`, {
        method: "PUT",
        token: doctorToken,
        body: {
          day: "MONDAY",
          startTime: "09:00",
          endTime: "12:00",
          slotMinutes: 30,
          isActive: true,
        },
      });
      if (blocked.status === 403) ok("availability", "doctor blocked on other doctor");
      else fail("availability", "doctor blocked on other doctor", `status ${blocked.status}`);
    }
  }

  const stamp = Date.now();
  const booking = await api("/public/bookings", {
    method: "POST",
    body: {
      patientName: `Phase4 Test ${stamp}`,
      email: `phase4.${stamp}@example.com`,
      phone: "+15550190099",
      serviceId: service.id,
      doctorId: doctor.id,
      date,
      slot: slotList[0],
      message: "Phase 4 verification booking",
    },
  });

  const appointmentId =
    booking.json.data?.appointment?.id || booking.json.data?.id || null;

  if ((booking.status === 201 || booking.status === 200) && appointmentId) {
    ok("booking", "create booking", appointmentId);
  } else {
    fail("booking", "create booking", booking.json.message || String(booking.status));
    return null;
  }
  const staffToken = tokens.STAFF?.token || tokens.SUPER_ADMIN?.token;
  if (staffToken && appointmentId) {
    const listed = await api("/admin/appointments", { token: staffToken });
    const found = (listed.json.data || []).some((a) => a.id === appointmentId);
    if (found) ok("appointments", "appears in admin list");
    else fail("appointments", "appears in admin list");

    const updated = await api(`/admin/appointments/${appointmentId}`, {
      method: "PUT",
      token: staffToken,
      body: { status: "CONFIRMED" },
    });
    if (updated.status === 200 && updated.json.data?.status === "CONFIRMED") {
      ok("appointments", "staff confirm booking");
    } else {
      fail("appointments", "staff confirm booking", updated.json.message || String(updated.status));
    }
  }

  if (tokens.DOCTOR?.token && tokens.DOCTOR.user.doctorId) {
    const scoped = await api("/admin/appointments", { token: tokens.DOCTOR.token });
    const rows = scoped.json.data || [];
    const foreign = rows.filter((a) => a.doctorId !== tokens.DOCTOR.user.doctorId);
    if (foreign.length === 0) ok("appointments", "doctor scope", `${rows.length} own rows`);
    else fail("appointments", "doctor scope", `${foreign.length} foreign rows`);
  }

  return { appointmentId, doctor, service, date, patientEmail: `phase4.${stamp}@example.com` };
}

async function sectionPayments(tokens, bookingCtx) {
  console.log("\n[4] Payments");
  const financeToken = tokens.FINANCE_MANAGER?.token || tokens.SUPER_ADMIN?.token;
  if (!financeToken) {
    fail("payments", "finance auth", "no token");
    return;
  }

  let patientId = null;
  if (bookingCtx?.patientEmail) {
    const patient = await prisma.patient.findUnique({
      where: { email: bookingCtx.patientEmail.toLowerCase() },
    });
    patientId = patient?.id || null;
  }
  if (!patientId) {
    const patients = await api("/admin/patients", { token: tokens.SUPER_ADMIN.token });
    patientId = patients.json.data?.[0]?.id;
  }

  if (!patientId) {
    fail("payments", "patient for payment", "none available");
    return;
  }

  const created = await api("/admin/payments", {
    method: "POST",
    token: financeToken,
    body: {
      patientId,
      amount: 150,
      method: "CREDIT_CARD",
      status: "PAID",
      notes: "Phase 4 verification payment",
      appointmentId: bookingCtx?.appointmentId || null,
    },
  });

  if (created.status === 201 || created.status === 200) {
    ok("payments", "create payment", created.json.data?.id || "created");
  } else {
    fail("payments", "create payment", created.json.message || String(created.status));
    return;
  }

  const paymentId = created.json.data?.id;
  const refund = await api(`/admin/payments/${paymentId}`, {
    method: "PUT",
    token: financeToken,
    body: { status: "REFUNDED" },
  });
  if (refund.status === 200 && refund.json.data?.status === "REFUNDED") {
    ok("payments", "refund status update");
  } else {
    fail("payments", "refund status update", refund.json.message || String(refund.status));
  }

  const finance = await api("/admin/finance", { token: financeToken });
  if (finance.status === 200 && finance.json.data) {
    ok("payments", "finance report");
  } else {
    fail("payments", "finance report", finance.json.message || String(finance.status));
  }

  const staffBlocked = await api("/admin/payments", {
    method: "POST",
    token: tokens.STAFF?.token,
    body: {
      patientId,
      amount: 10,
      method: "PRIVATE",
      status: "PENDING",
    },
  });
  if (staffBlocked.status === 403) ok("payments", "staff cannot create payments");
  else fail("payments", "staff cannot create payments", `status ${staffBlocked.status}`);
}

async function sectionContactAndDb() {
  console.log("\n[5] Contact · database integrity");

  const stamp = Date.now();
  const contact = await api("/public/contact", {
    method: "POST",
    body: {
      name: "Phase4 Contact",
      email: `phase4.contact.${stamp}@example.com`,
      phone: "+15550191122",
      subject: "Phase 4 check",
      message: "This is a Phase 4 verification contact message.",
    },
  });
  if (contact.status === 201 || contact.status === 200) {
    ok("contact", "public submit");
  } else {
    fail("contact", "public submit", contact.json.message || String(contact.status));
  }

  const counts = {
    users: await prisma.user.count(),
    doctors: await prisma.doctor.count(),
    services: await prisma.service.count(),
    appointments: await prisma.appointment.count(),
    patients: await prisma.patient.count(),
    payments: await prisma.payment.count(),
    contactMessages: await prisma.contactMessage.count(),
    settings: await prisma.settings.count(),
  };

  for (const [key, value] of Object.entries(counts)) {
    // payments/appointments may be zero on a fresh DB; require core clinic tables
    const requiredPositive = [
      "users",
      "doctors",
      "services",
      "patients",
      "contactMessages",
      "settings",
    ];
    if (!requiredPositive.includes(key) || value > 0) {
      ok("database", `${key} count`, String(value));
    } else {
      fail("database", `${key} count`, "zero");
    }
  }

  const roles = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });
  const roleSet = new Set(roles.map((r) => r.role));
  for (const needed of ["SUPER_ADMIN", "STAFF", "FINANCE_MANAGER", "DOCTOR"]) {
    if (roleSet.has(needed)) ok("database", `role ${needed} present`);
    else fail("database", `role ${needed} present`, "missing user");
  }

  const linkedDoctors = await prisma.doctor.count({
    where: { userId: { not: null } },
  });
  if (linkedDoctors >= 1) ok("database", "doctor user links", String(linkedDoctors));
  else fail("database", "doctor user links", "none");

  const settings = await prisma.settings.findUnique({ where: { id: "clinic" } });
  if (settings?.clinicName) ok("database", "clinic settings", settings.clinicName);
  else fail("database", "clinic settings");
}

async function main() {
  console.log("Phase 4 verification starting…");
  console.log(`Target: ${BASE}`);

  // Ensure health before long suite
  try {
    const probe = await fetch(`${API}/health`);
    if (!probe.ok) throw new Error(`health ${probe.status}`);
  } catch (error) {
    console.error(`Server not reachable at ${BASE}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  await sectionPublicSite();
  const tokens = await sectionRoles();
  const bookingCtx = await sectionBookingAndAvailability(tokens);
  await sectionPayments(tokens, bookingCtx);
  await sectionContactAndDb();

  console.log("\n========================");
  console.log(
    failures
      ? `Phase 4 verification FAILED · ${failures} issue(s)`
      : "Phase 4 verification PASSED · 0 issues",
  );
  console.log("========================\n");
  process.exitCode = failures ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
