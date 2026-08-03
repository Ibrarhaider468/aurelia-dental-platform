const API = "http://localhost:4000/api";

const accounts = [
  {
    key: "SUPER_ADMIN",
    email: "admin@aureliadental.com",
    password: "Admin123!",
  },
  {
    key: "STAFF",
    email: "staff@aureliadental.com",
    password: "Staff123!",
  },
  {
    key: "FINANCE_MANAGER",
    email: "finance@aureliadental.com",
    password: "Finance123!",
  },
  {
    key: "DOCTOR",
    email: "doctor@aureliadental.com",
    password: "Doctor123!",
  },
];

const checks = [
  { path: "/admin/dashboard", label: "dashboard" },
  { path: "/admin/appointments", label: "appointments" },
  { path: "/admin/patients", label: "patients" },
  { path: "/admin/services", label: "services" },
  { path: "/admin/schedule" /* invalid */, skip: true },
  { path: "/admin/holidays", label: "schedule" },
  { path: "/admin/payments", label: "payments" },
  { path: "/admin/finance", label: "finance" },
  { path: "/admin/memberships", label: "memberships" },
  { path: "/admin/insurance", label: "insurance" },
  { path: "/admin/settings", label: "settings" },
  { path: "/admin/users", label: "users" },
  { path: "/admin/gallery", label: "cms" },
  { path: "/admin/contact-messages", label: "contact" },
];

const expect = {
  SUPER_ADMIN: {
    allow: [
      "dashboard",
      "appointments",
      "patients",
      "services",
      "schedule",
      "payments",
      "finance",
      "memberships",
      "insurance",
      "settings",
      "users",
      "cms",
      "contact",
    ],
  },
  STAFF: {
    allow: ["dashboard", "appointments", "patients", "services", "schedule"],
    deny: [
      "payments",
      "finance",
      "memberships",
      "insurance",
      "settings",
      "users",
      "cms",
      "contact",
    ],
  },
  FINANCE_MANAGER: {
    allow: [
      "dashboard",
      "payments",
      "finance",
      "memberships",
      "insurance",
      "patients",
    ],
    deny: [
      "appointments",
      "services",
      "schedule",
      "settings",
      "users",
      "cms",
      "contact",
    ],
  },
  DOCTOR: {
    allow: ["dashboard", "appointments", "patients", "services", "schedule"],
    deny: [
      "payments",
      "finance",
      "memberships",
      "insurance",
      "settings",
      "users",
      "cms",
      "contact",
    ],
  },
};

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`${email}: ${json.message || res.status}`);
  }
  return json.data;
}

async function probe(token, path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.status;
}

async function main() {
  let failures = 0;

  for (const account of accounts) {
    const data = await login(account.email, account.password);
    const role = data.user.role;
    console.log(`\n=== ${account.key} login => role=${role} doctorId=${data.user.doctorId || "-"} ===`);
    if (role !== account.key && !(account.key === "SUPER_ADMIN" && role === "SUPER_ADMIN")) {
      console.log(`FAIL role mismatch expected ${account.key}`);
      failures += 1;
    }

    const matrix = expect[account.key];
    for (const check of checks) {
      if (check.skip) continue;
      const status = await probe(data.token, check.path);
      const allowed = matrix.allow.includes(check.label);
      const denied = matrix.deny?.includes(check.label);
      const ok = allowed ? status === 200 : denied ? status === 403 : true;
      const mark = ok ? "OK" : "FAIL";
      if (!ok) failures += 1;
      console.log(
        `${mark} ${check.label.padEnd(14)} ${status}${allowed ? " (allow)" : denied ? " (deny)" : ""}`,
      );
    }

    if (account.key === "DOCTOR") {
      const appts = await fetch(`${API}/admin/appointments`, {
        headers: { Authorization: `Bearer ${data.token}` },
      }).then((r) => r.json());
      const rows = appts.data || [];
      const foreign = rows.filter((a) => a.doctorId !== data.user.doctorId);
      if (foreign.length) {
        failures += 1;
        console.log(`FAIL doctor saw ${foreign.length} other-doctor appointments`);
      } else {
        console.log(`OK doctor appointments scoped (${rows.length} rows)`);
      }
    }
  }

  console.log(`\nVerification ${failures ? "FAILED" : "PASSED"} (${failures} failures)`);
  process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
