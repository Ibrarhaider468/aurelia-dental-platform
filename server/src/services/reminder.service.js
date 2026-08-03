import { prisma } from "../config/db.js";
import { notifyAppointmentReminder } from "./email.service.js";

function parseSlotMinutes(slot) {
  const match = String(slot || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function getAppointmentDateTime(appointment) {
  const base = new Date(appointment.date);
  const minutes = parseSlotMinutes(appointment.slot);
  // Appointment date is stored as UTC date-only; combine with slot clock time.
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      Math.floor(minutes / 60),
      minutes % 60,
      0,
      0,
    ),
  );
}

function hoursUntil(appointmentAt, now = new Date()) {
  return (appointmentAt.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export async function processAppointmentReminders(now = new Date()) {
  const upcoming = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      OR: [{ reminder24Sent: false }, { reminder12Sent: false }],
      date: {
        gte: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
        ),
        lte: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
        ),
      },
    },
    include: {
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, title: true } },
    },
  });

  const results = {
    checked: upcoming.length,
    sent24: 0,
    sent12: 0,
    skipped: 0,
    errors: [],
  };

  for (const appointment of upcoming) {
    const at = getAppointmentDateTime(appointment);
    const hours = hoursUntil(at, now);

    if (hours <= 0) {
      results.skipped += 1;
      continue;
    }

    try {
      if (!appointment.reminder24Sent && hours <= 24 && hours > 12) {
        await notifyAppointmentReminder(appointment, 24);
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminder24Sent: true, reminder24SentAt: now },
        });
        results.sent24 += 1;
      } else if (!appointment.reminder12Sent && hours <= 12) {
        await notifyAppointmentReminder(appointment, 12);
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            reminder12Sent: true,
            reminder12SentAt: now,
            // If somehow 24h window was missed, mark it to avoid later duplicates.
            reminder24Sent: true,
            reminder24SentAt: appointment.reminder24SentAt || now,
          },
        });
        results.sent12 += 1;
      } else {
        results.skipped += 1;
      }
    } catch (error) {
      results.errors.push({
        appointmentId: appointment.id,
        message: error.message,
      });
    }
  }

  return results;
}

let reminderTimer = null;

export function startReminderScheduler({
  intervalMs = 15 * 60 * 1000,
} = {}) {
  if (reminderTimer) return reminderTimer;

  const tick = async () => {
    try {
      const result = await processAppointmentReminders();
      if (result.sent24 || result.sent12 || result.errors.length) {
        console.log(
          `[reminders] checked=${result.checked} sent24=${result.sent24} sent12=${result.sent12} errors=${result.errors.length}`,
        );
      }
    } catch (error) {
      console.warn("[reminders]", error.message);
    }
  };

  // Initial delay keeps boot snappy; then run on interval.
  setTimeout(() => {
    void tick();
  }, 20_000);
  reminderTimer = setInterval(() => {
    void tick();
  }, intervalMs);
  if (typeof reminderTimer.unref === "function") reminderTimer.unref();
  console.log(
    `   Reminders:   every ${Math.round(intervalMs / 60000)} min (CONFIRMED only)`,
  );
  return reminderTimer;
}
