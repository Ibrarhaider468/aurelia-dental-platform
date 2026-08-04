/**
 * Extended smoke test — membership, CMS CRUD, detail pages, SEO, admin writes
 */
const BASE = process.env.VERIFY_BASE_URL || "http://localhost:4000";
const API = `${BASE}/api`;

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
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json, status: res.status };
}

async function page(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  return { res, text, status: res.status };
}

async function login(email, password) {
  const { res, json } = await api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!res.ok) throw new Error(json.message || `login ${res.status}`);
  return json.data.token;
}

async function main() {
  console.log("Full smoke verification…\nTarget:", BASE);

  console.log("\n[A] Detail pages + SEO");
  const treatments = await page("/treatments");
  const slugMatch = treatments.text.match(/\/treatments\/([a-z0-9-]+)/);
  if (slugMatch) {
    const detail = await page(`/treatments/${slugMatch[1]}`);
    if (detail.status === 200 && detail.text.includes("Book")) ok("treatment detail", slugMatch[1]);
    else fail("treatment detail", String(detail.status));
  } else fail("treatment detail", "no slug found on /treatments");

  const dentists = await page("/dentists");
  const docMatch = dentists.text.match(/\/dentists\/([a-z0-9-]+)/);
  if (docMatch) {
    const detail = await page(`/dentists/${docMatch[1]}`);
    if (detail.status === 200 && detail.text.includes("Book")) ok("doctor detail", docMatch[1]);
    else fail("doctor detail", String(detail.status));
  } else fail("doctor detail", "no slug found on /dentists");

  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const { status, text } = await page(path);
    if (status === 200 && text.length > 20) ok(path);
    else fail(path, String(status));
  }

  console.log("\n[B] Public APIs");
  for (const path of [
    "/public/services",
    "/public/doctors",
    "/public/membership-plans",
    "/public/insurance",
    "/public/payment-options",
  ]) {
    const { status, json } = await api(path);
    const data = json.data;
    const has =
      Array.isArray(data) ? data.length > 0 : data && Object.keys(data).length > 0;
    if (status === 200 && has) ok(path, Array.isArray(data) ? `${data.length} items` : "ok");
    else fail(path, json.message || String(status));
  }

  console.log("\n[C] Membership subscribe");
  const plans = await api("/public/membership-plans");
  const plan = plans.json.data?.[0];
  if (!plan) {
    fail("membership plan available");
  } else {
    const stamp = Date.now();
    const sub = await api("/public/memberships/subscribe", {
      method: "POST",
      body: {
        planId: plan.id,
        patientName: `Member Test ${stamp}`,
        email: `member.${stamp}@example.com`,
        phone: "+15550190099",
      },
    });
    if (sub.status === 201 || sub.status === 200) {
      ok("membership subscribe", sub.json.data?.id || "created");
    } else {
      fail("membership subscribe", sub.json.message || String(sub.status));
    }
  }

  console.log("\n[D] Admin CRUD smoke (SUPER_ADMIN)");
  const token = await login("admin@aureliadental.com", "Admin123!");
  ok("admin token");

  const stamp = Date.now();
  const faqCreate = await api("/admin/faqs", {
    method: "POST",
    token,
    body: {
      question: `Smoke FAQ ${stamp}?`,
      answer: "Automated smoke-test answer.",
      isActive: true,
      sortOrder: 99,
    },
  });
  if (faqCreate.status === 201 || faqCreate.status === 200) {
    ok("create FAQ", faqCreate.json.data?.id);
    const faqId = faqCreate.json.data?.id;
    if (faqId) {
      const del = await api(`/admin/faqs/${faqId}`, { method: "DELETE", token });
      if (del.status === 200 || del.status === 204) ok("delete FAQ");
      else fail("delete FAQ", String(del.status));
    }
  } else {
    fail("create FAQ", faqCreate.json.message || String(faqCreate.status));
  }

  const galleryList = await api("/admin/gallery", { token });
  if (galleryList.status === 200) ok("list gallery", `${galleryList.json.data?.length ?? 0} items`);
  else fail("list gallery", String(galleryList.status));

  const testimonials = await api("/admin/testimonials", { token });
  if (testimonials.status === 200) ok("list testimonials");
  else fail("list testimonials", String(testimonials.status));

  const contact = await api("/admin/contact-messages", { token });
  if (contact.status === 200) ok("list contact messages", `${contact.json.data?.length ?? contact.json.data?.items?.length ?? 0}`);
  else fail("list contact messages", String(contact.status));

  const settings = await api("/admin/settings", { token });
  if (settings.status === 200 && settings.json.data) ok("read settings");
  else fail("read settings", String(settings.status));

  const mail = await api("/admin/mail-status", { token });
  if (mail.status === 200) ok("mail status");
  else fail("mail status", String(mail.status));

  const users = await api("/admin/users", { token });
  if (users.status === 200) ok("list users");
  else fail("list users", String(users.status));

  // Contact message status update if any exist
  const messages = contact.json.data?.items || contact.json.data || [];
  const firstMsg = Array.isArray(messages) ? messages[0] : null;
  if (firstMsg?.id) {
    const upd = await api(`/admin/contact-messages/${firstMsg.id}/status`, {
      method: "PUT",
      token,
      body: { status: firstMsg.status === "READ" ? "NEW" : "READ" },
    });
    if (upd.status === 200) ok("update contact message status");
    else fail("update contact message status", upd.json.message || String(upd.status));
  } else {
    ok("update contact message status", "skipped (none)");
  }

  console.log("\n========================");
  if (failures) {
    console.log(`Full smoke FAILED · ${failures} issue(s)`);
    process.exit(1);
  }
  console.log("Full smoke PASSED · 0 issues");
  console.log("========================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
