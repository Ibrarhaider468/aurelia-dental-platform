/**
 * Phase 4 — notification & reminder verification
 */
import { PrismaClient } from "@prisma/client";
import {
  processAppointmentReminders,
  getAppointmentDateTime,
} from "../src/services/reminder.service.js";

const prisma = new PrismaClient();
const API = process.env.VERIFY_BASE_URL || "http://localhost:4000";
let failures = 0;

function ok(name, detail = "") {
  console.log(`  OK   ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failures += 1;
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login() {
  const { status, json } = await api("/auth/login", {
    method: "POST",
    body: {
      email: "admin@aureliadental.com",
      password: "Admin123!",
    },
  });
  if (status !== 200) throw new Error(json.message || "login failed");
  return json.data.token;
}

async function main() {
  console.log("Notification verification starting…");
  const token = await login();
  const stamp = Date.now();

  const doctors = await api("/public/doctors");
  const services = await api("/public/services");
  const doctor = doctors.json.data?.[0];
  const service = services.json.data?.[0];
  if (!doctor || !service) throw new Error("Missing doctor/service seed data");

  const days = await api(`/public/doctors/${doctor.id}/days`);
  const dayList = days.json.data?.days || [];
  const dayMap = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const target = dayMap[dayList[0] || "MONDAY"];
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  let date = null;
  for (let i = 1; i <= 14; i += 1) {
    const c = new Date(d);
    c.setUTCDate(d.getUTCDate() + i);
    if (c.getUTCDay() === target) {
      date = c.toISOString().slice(0, 10);
      break;
    }
  }
  const slots = await api(
    `/public/slots?doctorId=${encodeURIComponent(doctor.id)}&date=${date}`,
  );
  const slot = slots.json.data?.slots?.[0];
  if (!slot) throw new Error("No open slots for booking test");

  // 1) Booking creates email log
  const booking = await api("/public/bookings", {
    method: "POST",
    body: {
      patientName: `Notify Test ${stamp}`,
      email: `notify.${stamp}@example.com`,
      phone: "+15550194455",
      serviceId: service.id,
      doctorId: doctor.id,
      date,
      slot,
      message: "Notification verification booking",
    },
  });
  const appointmentId = booking.json.data?.appointment?.id;
  if (booking.status === 201 && appointmentId) ok("booking created", appointmentId);
  else fail("booking created", booking.json.message || String(booking.status));

  await new Promise((r) => setTimeout(r, 300));
  const receivedLogs = await prisma.emailLog.count({
    where: {
      type: { in: ["BOOKING_RECEIVED", "BOOKING_RECEIVED_ADMIN"] },
      meta: { path: ["appointmentId"], equals: appointmentId },
    },
  });
  if (receivedLogs >= 1) ok("booking email log", `${receivedLogs} log(s)`);
  else fail("booking email log", "none found");

  // 2) Confirm appointment sends confirmation email
  const confirmed = await api(`/admin/appointments/${appointmentId}`, {
    method: "PUT",
    token,
    body: { status: "CONFIRMED" },
  });
  if (confirmed.status === 200 && confirmed.json.data?.status === "CONFIRMED") {
    ok("appointment confirmed");
  } else fail("appointment confirmed", confirmed.json.message || String(confirmed.status));

  await new Promise((r) => setTimeout(r, 300));
  const confirmLogs = await prisma.emailLog.count({
    where: {
      type: "BOOKING_CONFIRMED",
      meta: { path: ["appointmentId"], equals: appointmentId },
    },
  });
  if (confirmLogs >= 1) ok("confirmation email log", `${confirmLogs} log(s)`);
  else fail("confirmation email log");

  // 3) Contact form acknowledgement
  const contact = await api("/public/contact", {
    method: "POST",
    body: {
      name: "Notify Contact",
      email: `notify.contact.${stamp}@example.com`,
      phone: "+15550195566",
      subject: "Notification check",
      message: "Please acknowledge this contact form verification message.",
    },
  });
  if (contact.status === 201 || contact.status === 200) ok("contact submitted");
  else fail("contact submitted", contact.json.message || String(contact.status));

  await new Promise((r) => setTimeout(r, 300));
  const contactLogs = await prisma.emailLog.count({
    where: { type: { in: ["CONTACT_ACK", "CONTACT_ADMIN"] } },
    orderBy: { createdAt: "desc" },
  });
  // count recent
  const recentContact = await prisma.emailLog.count({
    where: {
      type: { in: ["CONTACT_ACK", "CONTACT_ADMIN"] },
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentContact >= 1) ok("contact email log", `${recentContact} recent log(s)`);
  else fail("contact email log");

  // 4 + 5) Reminder scheduler for upcoming confirmed appointment
  const now = new Date();
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const reminderAppt = await prisma.appointment.create({
    data: {
      patientName: "Reminder Patient",
      email: `reminder.${stamp}@example.com`,
      phone: "+15550196677",
      doctorId: doctor.id,
      serviceId: service.id,
      date: new Date(
        Date.UTC(in23h.getUTCFullYear(), in23h.getUTCMonth(), in23h.getUTCDate()),
      ),
      slot: `${String(in23h.getUTCHours()).padStart(2, "0")}:${String(in23h.getUTCMinutes()).padStart(2, "0")}`,
      status: "CONFIRMED",
      reminder24Sent: false,
      reminder12Sent: false,
    },
    include: {
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, title: true } },
    },
  });

  const hours =
    (getAppointmentDateTime(reminderAppt).getTime() - now.getTime()) /
    (1000 * 60 * 60);
  ok("reminder fixture hours", hours.toFixed(2));

  const first = await processAppointmentReminders(now);
  if (first.sent24 >= 1) ok("reminder 24h sent", `sent24=${first.sent24}`);
  else fail("reminder 24h sent", JSON.stringify(first));

  const second = await processAppointmentReminders(now);
  if (second.sent24 === 0) ok("no duplicate 24h reminder");
  else fail("no duplicate 24h reminder", `sent24=${second.sent24}`);

  const updated = await prisma.appointment.findUnique({
    where: { id: reminderAppt.id },
  });
  if (updated?.reminder24Sent) ok("reminder24Sent flagged");
  else fail("reminder24Sent flagged");

  // 12h window
  const in11h = new Date(now.getTime() + 11 * 60 * 60 * 1000);
  await prisma.appointment.update({
    where: { id: reminderAppt.id },
    data: {
      date: new Date(
        Date.UTC(in11h.getUTCFullYear(), in11h.getUTCMonth(), in11h.getUTCDate()),
      ),
      slot: `${String(in11h.getUTCHours()).padStart(2, "0")}:${String(in11h.getUTCMinutes()).padStart(2, "0")}`,
      reminder12Sent: false,
    },
  });
  const third = await processAppointmentReminders(now);
  if (third.sent12 >= 1) ok("reminder 12h sent", `sent12=${third.sent12}`);
  else fail("reminder 12h sent", JSON.stringify(third));

  const fourth = await processAppointmentReminders(now);
  if (fourth.sent12 === 0) ok("no duplicate 12h reminder");
  else fail("no duplicate 12h reminder", `sent12=${fourth.sent12}`);

  // Cancelled should not remind
  const cancelled = await prisma.appointment.create({
    data: {
      patientName: "Cancelled Reminder",
      email: `cancelled.${stamp}@example.com`,
      phone: "+15550197788",
      doctorId: doctor.id,
      serviceId: service.id,
      date: new Date(
        Date.UTC(in23h.getUTCFullYear(), in23h.getUTCMonth(), in23h.getUTCDate()),
      ),
      slot: `${String(in23h.getUTCHours()).padStart(2, "0")}:${String(in23h.getUTCMinutes()).padStart(2, "0")}`,
      status: "CANCELLED",
    },
  });
  const cancelPass = await processAppointmentReminders(now);
  const cancelLogs = await prisma.emailLog.count({
    where: {
      type: { in: ["REMINDER_24", "REMINDER_12"] },
      meta: { path: ["appointmentId"], equals: cancelled.id },
    },
  });
  if (cancelLogs === 0) ok("cancelled appointments not reminded");
  else fail("cancelled appointments not reminded", `${cancelLogs} logs`);

  // Settings SMTP fields exist
  const settings = await api("/admin/settings", { token });
  if (settings.status === 200 && "smtpHost" in (settings.json.data || {})) {
    ok("admin SMTP settings fields");
  } else fail("admin SMTP settings fields");

  // Cleanup fixtures
  await prisma.appointment.deleteMany({
    where: { id: { in: [reminderAppt.id, cancelled.id] } },
  });

  console.log(
    `\nVerification ${failures ? "FAILED" : "PASSED"} · ${failures} issue(s)\n`,
  );
  // silence unused
  void contactLogs;
  void cancelPass;
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
