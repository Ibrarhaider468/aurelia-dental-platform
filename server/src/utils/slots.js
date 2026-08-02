/**
 * Slot generation helpers — used by booking system (Phase 4).
 */

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function generateTimeSlots({
  startTime,
  endTime,
  breakStart = null,
  breakEnd = null,
  slotMinutes = 30,
}) {
  const slots = [];
  let cursor = toMinutes(startTime);
  const end = toMinutes(endTime);
  const breakFrom = breakStart ? toMinutes(breakStart) : null;
  const breakTo = breakEnd ? toMinutes(breakEnd) : null;

  while (cursor + slotMinutes <= end) {
    const slotEnd = cursor + slotMinutes;
    const inBreak =
      breakFrom !== null &&
      breakTo !== null &&
      cursor < breakTo &&
      slotEnd > breakFrom;

    if (!inBreak) {
      slots.push(toTime(cursor));
    }

    cursor += slotMinutes;
  }

  return slots;
}
