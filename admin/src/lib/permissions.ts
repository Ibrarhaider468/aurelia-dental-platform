export type Role =
  | "SUPER_ADMIN"
  | "STAFF"
  | "FINANCE_MANAGER"
  | "DOCTOR"
  | "ADMIN";

export const PERMISSIONS = {
  DASHBOARD: "dashboard:read",
  DOCTORS_READ: "doctors:read",
  DOCTORS_MANAGE: "doctors:manage",
  SERVICES_READ: "services:read",
  SERVICES_MANAGE: "services:manage",
  APPOINTMENTS_READ: "appointments:read",
  APPOINTMENTS_MANAGE: "appointments:manage",
  PATIENTS_READ: "patients:read",
  PATIENTS_MANAGE: "patients:manage",
  SCHEDULE_READ: "schedule:read",
  SCHEDULE_MANAGE: "schedule:manage",
  AVAILABILITY_OWN: "availability:manage_own",
  PAYMENTS_READ: "payments:read",
  PAYMENTS_MANAGE: "payments:manage",
  FINANCE_READ: "finance:read",
  MEMBERSHIPS_READ: "memberships:read",
  MEMBERSHIPS_MANAGE: "memberships:manage",
  INSURANCE_READ: "insurance:read",
  INSURANCE_MANAGE: "insurance:manage",
  CMS_MANAGE: "cms:manage",
  CONTACT_MANAGE: "contact:manage",
  SETTINGS_READ: "settings:read",
  SETTINGS_MANAGE: "settings:manage",
  USERS_MANAGE: "users:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL = Object.values(PERMISSIONS);

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL,
  STAFF: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.DOCTORS_READ,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_MANAGE,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.SCHEDULE_MANAGE,
  ],
  FINANCE_MANAGER: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_MANAGE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.MEMBERSHIPS_READ,
    PERMISSIONS.MEMBERSHIPS_MANAGE,
    PERMISSIONS.INSURANCE_READ,
    PERMISSIONS.INSURANCE_MANAGE,
    PERMISSIONS.PATIENTS_READ,
  ],
  DOCTOR: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.DOCTORS_READ,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.AVAILABILITY_OWN,
  ],
};

export function normalizeRole(role?: string | null): string {
  if (role === "ADMIN") return "SUPER_ADMIN";
  return role || "";
}

/** Role defaults — used when a user has no custom override list. */
export function permissionsForRole(role?: string | null): Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)]
    ? [...ROLE_PERMISSIONS[normalizeRole(role)]]
    : [];
}

export const ALL_PERMISSIONS = ALL;

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Overview",
    permissions: [PERMISSIONS.DASHBOARD],
  },
  {
    label: "Doctors",
    permissions: [PERMISSIONS.DOCTORS_READ, PERMISSIONS.DOCTORS_MANAGE],
  },
  {
    label: "Services",
    permissions: [PERMISSIONS.SERVICES_READ, PERMISSIONS.SERVICES_MANAGE],
  },
  {
    label: "Appointments",
    permissions: [PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_MANAGE],
  },
  {
    label: "Patients",
    permissions: [PERMISSIONS.PATIENTS_READ, PERMISSIONS.PATIENTS_MANAGE],
  },
  {
    label: "Schedule",
    permissions: [
      PERMISSIONS.SCHEDULE_READ,
      PERMISSIONS.SCHEDULE_MANAGE,
      PERMISSIONS.AVAILABILITY_OWN,
    ],
  },
  {
    label: "Finance",
    permissions: [
      PERMISSIONS.PAYMENTS_READ,
      PERMISSIONS.PAYMENTS_MANAGE,
      PERMISSIONS.FINANCE_READ,
    ],
  },
  {
    label: "Memberships & insurance",
    permissions: [
      PERMISSIONS.MEMBERSHIPS_READ,
      PERMISSIONS.MEMBERSHIPS_MANAGE,
      PERMISSIONS.INSURANCE_READ,
      PERMISSIONS.INSURANCE_MANAGE,
    ],
  },
  {
    label: "CMS & contact",
    permissions: [PERMISSIONS.CMS_MANAGE, PERMISSIONS.CONTACT_MANAGE],
  },
  {
    label: "Settings & users",
    permissions: [
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.USERS_MANAGE,
    ],
  },
];

export function permissionLabel(permission: string) {
  return permission.replace(":", " · ").replaceAll("_", " ");
}

/**
 * When `explicit` is provided (from /auth/me), it is the effective access list.
 * Otherwise falls back to role defaults.
 */
export function hasPermission(
  role: string | undefined | null,
  permission: Permission,
  explicit?: string[] | null,
) {
  if (Array.isArray(explicit)) {
    return explicit.includes(permission);
  }
  return ROLE_PERMISSIONS[normalizeRole(role)]?.includes(permission) ?? false;
}

/** Normalize /admin/... nav paths to the permission map keys (/doctors, etc.). */
export function adminPermissionPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "admin") {
    return parts.length <= 1 ? "/" : `/${parts[1]}`;
  }
  return path === "/" ? "/" : `/${parts[0] || ""}`;
}

export function canAccessPath(
  path: string,
  role: string | undefined | null,
  explicit?: string[] | null,
) {
  const key = adminPermissionPath(path);
  const map: Record<string, Permission | Permission[]> = {
    "/": PERMISSIONS.DASHBOARD,
    "/doctors": PERMISSIONS.DOCTORS_READ,
    "/services": PERMISSIONS.SERVICES_READ,
    "/appointments": PERMISSIONS.APPOINTMENTS_READ,
    "/schedule": [PERMISSIONS.SCHEDULE_READ, PERMISSIONS.AVAILABILITY_OWN],
    "/patients": PERMISSIONS.PATIENTS_READ,
    "/payments": PERMISSIONS.PAYMENTS_READ,
    "/memberships": PERMISSIONS.MEMBERSHIPS_READ,
    "/insurance": PERMISSIONS.INSURANCE_READ,
    "/gallery": PERMISSIONS.CMS_MANAGE,
    "/testimonials": PERMISSIONS.CMS_MANAGE,
    "/cms": PERMISSIONS.CMS_MANAGE,
    "/contact-messages": PERMISSIONS.CONTACT_MANAGE,
    "/settings": PERMISSIONS.SETTINGS_MANAGE,
    "/users": PERMISSIONS.USERS_MANAGE,
  };

  const required = map[key];
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => hasPermission(role, p, explicit));
}

export function roleLabel(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized.replaceAll("_", " ");
}
