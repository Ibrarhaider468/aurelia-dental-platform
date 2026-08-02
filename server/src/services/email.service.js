import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";

let transporter = null;

function isMailConfigured() {
  return Boolean(env.mail.host && env.mail.user && env.mail.pass);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: {
        user: env.mail.user,
        pass: env.mail.pass,
      },
    });
  }
  return transporter;
}

async function getClinicName() {
  const settings = await prisma.settings.findUnique({ where: { id: "clinic" } });
  return settings?.clinicName || "Aurelia Dental";
}

function appointmentLines(appointment, dateStr) {
  return [
    `Patient: ${appointment.patientName}`,
    `Email: ${appointment.email}`,
    `Phone: ${appointment.phone}`,
    `Service: ${appointment.service?.title || "Treatment"}`,
    `Dentist: ${appointment.doctor?.name || "Dentist"}`,
    `Date: ${dateStr}`,
    `Time: ${appointment.slot}`,
    `Status: ${appointment.status}`,
  ];
}

export async function sendEmail({ to, subject, text, html }) {
  const tx = getTransporter();
  const payload = {
    from: env.mail.from,
    to,
    subject,
    text,
    html: html || `<pre style="font-family:sans-serif">${text}</pre>`,
  };

  if (!tx) {
    if (env.isDev) {
      console.log("\n[email:dev-fallback]", JSON.stringify(payload, null, 2), "\n");
    }
    return {
      delivered: false,
      mode: "log",
      preview: payload,
    };
  }

  const info = await tx.sendMail(payload);
  return {
    delivered: true,
    mode: "smtp",
    messageId: info.messageId,
    preview: payload,
  };
}

export async function notifyBookingReceived(appointment) {
  const clinic = await getClinicName();
  const dateStr = new Date(appointment.date).toISOString().slice(0, 10);
  const lines = appointmentLines(appointment, dateStr);

  const patient = await sendEmail({
    to: appointment.email,
    subject: `${clinic}: booking request received`,
    text: [
      `Dear ${appointment.patientName},`,
      "",
      "Thank you for your appointment request.",
      ...lines,
      "",
      "Our team will review and confirm shortly.",
      "",
      clinic,
    ].join("\n"),
  });

  const adminTo = env.adminEmail;
  const admin = adminTo
    ? await sendEmail({
        to: adminTo,
        subject: `${clinic}: new appointment request`,
        text: ["A new booking was submitted.", "", ...lines].join("\n"),
      })
    : null;

  return { patient, admin };
}

export async function notifyBookingStatus(appointment, status) {
  const clinic = await getClinicName();
  const dateStr = new Date(appointment.date).toISOString().slice(0, 10);
  const lines = appointmentLines(appointment, dateStr);

  const copy = {
    CONFIRMED: {
      subject: `${clinic}: appointment confirmed`,
      intro: "Your appointment has been confirmed.",
    },
    CANCELLED: {
      subject: `${clinic}: appointment cancelled`,
      intro: "Your appointment has been cancelled.",
    },
    RESCHEDULED: {
      subject: `${clinic}: appointment rescheduled`,
      intro: "Your appointment has been rescheduled.",
    },
    COMPLETED: {
      subject: `${clinic}: visit completed`,
      intro: "Thank you for visiting us. Your appointment is marked completed.",
    },
    PENDING: {
      subject: `${clinic}: appointment pending`,
      intro: "Your appointment is pending confirmation.",
    },
  }[status] || {
    subject: `${clinic}: appointment update`,
    intro: `Your appointment status is now ${status}.`,
  };

  return sendEmail({
    to: appointment.email,
    subject: copy.subject,
    text: [
      `Dear ${appointment.patientName},`,
      "",
      copy.intro,
      ...lines,
      appointment.rescheduleReason
        ? `Note: ${appointment.rescheduleReason}`
        : "",
      "",
      clinic,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export function getMailStatus() {
  return {
    configured: isMailConfigured(),
    from: env.mail.from,
    host: env.mail.host || null,
  };
}
