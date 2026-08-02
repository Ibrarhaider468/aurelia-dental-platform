export function sanitizeString(value, { max = 2000 } = {}) {
  if (value === null || value === undefined) return value;
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

export function sanitizeEmail(value) {
  return sanitizeString(value, { max: 254 })?.toLowerCase() || "";
}

export function sanitizePhone(value) {
  return sanitizeString(String(value || "").replace(/[^\d+\-\s()]/g, ""), {
    max: 40,
  });
}

export function isPastDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateStr}T00:00:00`);
  return date < today;
}

export function isPastDateTime(dateStr, slot) {
  const now = new Date();
  const [h, m] = slot.split(":").map(Number);
  const dt = new Date(`${dateStr}T00:00:00`);
  dt.setHours(h, m, 0, 0);
  return dt <= now;
}

export function toDateOnlyUTC(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function formatDateISO(date) {
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}
