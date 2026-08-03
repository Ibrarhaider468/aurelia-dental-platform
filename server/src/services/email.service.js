import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import {
  formatAppointmentDate,
  renderBrandedEmail,
} from "../utils/emailTemplates.js";

let transporter = null;
let transporterKey = "";

function envMailConfig() {
  return {
    host: env.mail.host || "",
    port: Number(env.mail.port || 587),
    user: env.mail.user || "",
    pass: env.mail.pass || "",
    from: env.mail.from || "Aurelia Dental <noreply@aureliadental.com>",
  };
}

export async function resolveMailConfig() {
  const settings = await prisma.settings.findUnique({ where: { id: "clinic" } });
  const fallback = envMailConfig();
  return {
    host: settings?.smtpHost || fallback.host,
    port: Number(settings?.smtpPort || fallback.port || 587),
    user: settings?.smtpUser || fallback.user,
    pass: settings?.smtpPass || fallback.pass,
    from:
      settings?.mailFrom ||
      (settings?.email
        ? `${settings.clinicName || "Aurelia Dental"} <${settings.email}>`
        : fallback.from),
    clinicName: settings?.clinicName || "Aurelia Dental",
    phone: settings?.phone || null,
    email: settings?.email || null,
    address: settings?.address || null,
    adminNotifyEmail: settings?.email || env.adminEmail || null,
  };
}

function isConfigured(config) {
  return Boolean(config?.host && config?.user && config?.pass);
}

export function resetMailTransport() {
  transporter = null;
  transporterKey = "";
}

async function getTransporter(config) {
  if (!isConfigured(config)) return null;
  const key = `${config.host}|${config.port}|${config.user}|${config.pass}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: Number(config.port) === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    transporterKey = key;
  }
  return transporter;
}

async function logEmail({ to, subject, type, status, meta }) {
  try {
    return await prisma.emailLog.create({
      data: {
        to,
        subject,
        type,
        status,
        meta: meta || undefined,
      },
    });
  } catch (error) {
    if (env.isDev) {
      console.warn("[email-log]", error.message);
    }
    return null;
  }
}

export async function sendEmail({ to, subject, text, html, type = "GENERIC", meta }) {
  const config = await resolveMailConfig();
  const tx = await getTransporter(config);
  const payload = {
    from: config.from,
    to,
    subject,
    text,
    html:
      html ||
      `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${text}</pre>`,
  };

  if (!tx) {
    if (env.isDev) {
      console.log("\n[email:dev-fallback]", JSON.stringify({ type, ...payload }, null, 2), "\n");
    }
    await logEmail({
      to,
      subject,
      type,
      status: "LOGGED",
      meta: { ...(meta || {}), mode: "log" },
    });
    return {
      delivered: false,
      mode: "log",
      preview: payload,
    };
  }

  try {
    const info = await tx.sendMail(payload);
    await logEmail({
      to,
      subject,
      type,
      status: "SENT",
      meta: { ...(meta || {}), messageId: info.messageId, mode: "smtp" },
    });
    return {
      delivered: true,
      mode: "smtp",
      messageId: info.messageId,
      preview: payload,
    };
  } catch (error) {
    await logEmail({
      to,
      subject,
      type,
      status: "FAILED",
      meta: { ...(meta || {}), error: error.message, mode: "smtp" },
    });
    throw error;
  }
}

function appointmentDetails(appointment) {
  return [
    ["Patient", appointment.patientName],
    ["Treatment", appointment.service?.title || "Treatment"],
    ["Dentist", appointment.doctor?.name || "Dentist"],
    ["Date", formatAppointmentDate(appointment.date)],
    ["Time", appointment.slot],
    ["Status", appointment.status],
    appointment.phone ? ["Phone", appointment.phone] : null,
  ].filter(Boolean);
}

export async function notifyBookingReceived(appointment) {
  const config = await resolveMailConfig();
  const details = appointmentDetails(appointment);

  const branded = renderBrandedEmail({
    clinicName: config.clinicName,
    title: "Booking request received",
    intro: `Dear ${appointment.patientName}, thank you for requesting an appointment with ${config.clinicName}. Our team will review your request and confirm shortly.`,
    details,
    footerNote:
      "If you need to change anything before confirmation, reply to this email or call the clinic.",
    phone: config.phone,
    email: config.email,
    address: config.address,
  });

  const patient = await sendEmail({
    to: appointment.email,
    subject: `${config.clinicName}: booking request received`,
    text: branded.text,
    html: branded.html,
    type: "BOOKING_RECEIVED",
    meta: { appointmentId: appointment.id },
  });

  let admin = null;
  if (config.adminNotifyEmail) {
    const adminBrand = renderBrandedEmail({
      clinicName: config.clinicName,
      title: "New appointment request",
      intro: "A new booking was submitted on the website.",
      details: [...details, ["Patient email", appointment.email]],
      phone: config.phone,
      email: config.email,
      address: config.address,
    });
    admin = await sendEmail({
      to: config.adminNotifyEmail,
      subject: `${config.clinicName}: new appointment request`,
      text: adminBrand.text,
      html: adminBrand.html,
      type: "BOOKING_RECEIVED_ADMIN",
      meta: { appointmentId: appointment.id },
    });
  }

  return { patient, admin };
}

export async function notifyBookingStatus(appointment, status) {
  const config = await resolveMailConfig();
  const details = appointmentDetails({ ...appointment, status });

  const copy = {
    CONFIRMED: {
      type: "BOOKING_CONFIRMED",
      subject: `${config.clinicName}: appointment confirmed`,
      title: "Your appointment is confirmed",
      intro: `Dear ${appointment.patientName}, your appointment with ${config.clinicName} is confirmed. We look forward to welcoming you.`,
      footer:
        "Please arrive a few minutes early. Contact us if you need to reschedule.",
    },
    CANCELLED: {
      type: "BOOKING_CANCELLED",
      subject: `${config.clinicName}: appointment cancelled`,
      title: "Appointment cancelled",
      intro: `Dear ${appointment.patientName}, your appointment has been cancelled. You can book a new time whenever you are ready.`,
    },
    RESCHEDULED: {
      type: "BOOKING_RESCHEDULED",
      subject: `${config.clinicName}: appointment rescheduled`,
      title: "Appointment rescheduled",
      intro: `Dear ${appointment.patientName}, your appointment has been rescheduled. Please review the updated details below.`,
    },
    COMPLETED: {
      type: "BOOKING_COMPLETED",
      subject: `${config.clinicName}: visit completed`,
      title: "Thank you for visiting",
      intro: `Dear ${appointment.patientName}, thank you for visiting ${config.clinicName}. Your appointment is marked completed.`,
    },
    PENDING: {
      type: "BOOKING_PENDING",
      subject: `${config.clinicName}: appointment pending`,
      title: "Appointment pending confirmation",
      intro: `Dear ${appointment.patientName}, your appointment is pending confirmation from our team.`,
    },
  }[status] || {
    type: "BOOKING_UPDATE",
    subject: `${config.clinicName}: appointment update`,
    title: "Appointment update",
    intro: `Dear ${appointment.patientName}, your appointment status is now ${status}.`,
  };

  if (appointment.rescheduleReason) {
    details.push(["Note", appointment.rescheduleReason]);
  }

  const branded = renderBrandedEmail({
    clinicName: config.clinicName,
    title: copy.title,
    intro: copy.intro,
    details,
    footerNote: copy.footer,
    phone: config.phone,
    email: config.email,
    address: config.address,
  });

  return sendEmail({
    to: appointment.email,
    subject: copy.subject,
    text: branded.text,
    html: branded.html,
    type: copy.type,
    meta: { appointmentId: appointment.id, status },
  });
}

export async function notifyContactReceived(message) {
  const config = await resolveMailConfig();

  const patientBrand = renderBrandedEmail({
    clinicName: config.clinicName,
    title: "We received your message",
    intro: `Dear ${message.name}, thank you for contacting ${config.clinicName}. Our team has received your inquiry and will respond as soon as possible.`,
    details: [
      ["Subject", message.subject],
      ["Your message", message.message],
    ],
    footerNote: "This is an automated acknowledgement. Please do not reply with sensitive medical details by email unless requested.",
    phone: config.phone,
    email: config.email,
    address: config.address,
  });

  const patient = await sendEmail({
    to: message.email,
    subject: `${config.clinicName}: we received your message`,
    text: patientBrand.text,
    html: patientBrand.html,
    type: "CONTACT_ACK",
    meta: { contactMessageId: message.id },
  });

  let admin = null;
  if (config.adminNotifyEmail) {
    const adminBrand = renderBrandedEmail({
      clinicName: config.clinicName,
      title: "New contact inquiry",
      intro: "A new message was submitted through the website contact form.",
      details: [
        ["Name", message.name],
        ["Email", message.email],
        ["Phone", message.phone],
        ["Subject", message.subject],
        ["Message", message.message],
      ],
      phone: config.phone,
      email: config.email,
      address: config.address,
    });
    admin = await sendEmail({
      to: config.adminNotifyEmail,
      subject: `${config.clinicName}: new contact inquiry`,
      text: adminBrand.text,
      html: adminBrand.html,
      type: "CONTACT_ADMIN",
      meta: { contactMessageId: message.id },
    });
  }

  return { patient, admin };
}

export async function notifyAppointmentReminder(appointment, windowHours) {
  const config = await resolveMailConfig();
  const details = appointmentDetails(appointment);
  const branded = renderBrandedEmail({
    clinicName: config.clinicName,
    title: `Reminder: appointment in ${windowHours} hours`,
    intro: `Dear ${appointment.patientName}, this is a friendly reminder about your upcoming appointment at ${config.clinicName}.`,
    details,
    footerNote:
      "If you can no longer attend, please contact the clinic as soon as possible so we can offer the time to another patient.",
    phone: config.phone,
    email: config.email,
    address: config.address,
  });

  return sendEmail({
    to: appointment.email,
    subject: `${config.clinicName}: appointment reminder (${windowHours}h)`,
    text: branded.text,
    html: branded.html,
    type: windowHours === 24 ? "REMINDER_24" : "REMINDER_12",
    meta: { appointmentId: appointment.id, windowHours },
  });
}

export async function getMailStatus() {
  const config = await resolveMailConfig();
  return {
    configured: isConfigured(config),
    from: config.from,
    host: config.host || null,
    port: config.port || null,
    user: config.user || null,
    hasPassword: Boolean(config.pass),
    source:
      (await prisma.settings.findUnique({ where: { id: "clinic" } }))?.smtpHost
        ? "settings"
        : config.host
          ? "env"
          : "none",
  };
}
