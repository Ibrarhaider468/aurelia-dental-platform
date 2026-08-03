function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e7ebe8;color:#879087;font-size:13px;width:38%;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e7ebe8;color:#141816;font-size:14px;font-weight:600;">
        ${escapeHtml(value)}
      </td>
    </tr>`;
}

export function renderBrandedEmail({
  clinicName,
  title,
  intro,
  details = [],
  footerNote,
  phone,
  email,
  address,
}) {
  const rows = details.map(([label, value]) => detailRow(label, value)).join("");
  const contactBits = [
    phone ? `Phone: ${escapeHtml(phone)}` : "",
    email ? `Email: ${escapeHtml(email)}` : "",
    address ? `Address: ${escapeHtml(address)}` : "",
  ]
    .filter(Boolean)
    .join("<br/>");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f2f4f3;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f3;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e7ebe8;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:#141816;padding:28px 32px;">
              <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:-0.02em;color:#ffffff;">
                ${escapeHtml(clinicName || "Aurelia Dental")}
              </div>
              <div style="margin-top:8px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9a8660;">
                Premium Dental Care
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:#141816;font-weight:600;">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#5f675f;">
                ${escapeHtml(intro)}
              </p>
              ${
                rows
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;font-family:Arial,sans-serif;">${rows}</table>`
                  : ""
              }
              ${
                footerNote
                  ? `<p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#5f675f;">${escapeHtml(footerNote)}</p>`
                  : ""
              }
              ${
                contactBits
                  ? `<div style="margin-top:8px;padding:16px 18px;background:#f2f4f3;border-radius:12px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#5f675f;">${contactBits}</div>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 26px;border-top:1px solid #e7ebe8;font-family:Arial,sans-serif;font-size:12px;color:#879087;">
              ${escapeHtml(clinicName || "Aurelia Dental")} · Quiet luxury in modern dentistry
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textDetails = details
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  const text = [
    clinicName || "Aurelia Dental",
    "",
    title,
    "",
    intro,
    textDetails ? `\n${textDetails}` : "",
    footerNote ? `\n${footerNote}` : "",
    phone || email || address
      ? `\nClinic contact\n${[
          phone ? `Phone: ${phone}` : "",
          email ? `Email: ${email}` : "",
          address ? `Address: ${address}` : "",
        ]
          .filter(Boolean)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}

export function formatAppointmentDate(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
