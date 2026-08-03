export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  STAFF: "STAFF",
  FINANCE_MANAGER: "FINANCE_MANAGER",
  DOCTOR: "DOCTOR",
});

/** Legacy ADMIN is treated as SUPER_ADMIN everywhere. */
export function normalizeRole(role) {
  if (role === "ADMIN") return ROLES.SUPER_ADMIN;
  return role;
}

export const PERMISSIONS = Object.freeze({
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
});

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,

  [ROLES.STAFF]: [
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

  [ROLES.FINANCE_MANAGER]: [
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

  [ROLES.DOCTOR]: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.DOCTORS_READ,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_MANAGE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.AVAILABILITY_OWN,
  ],
});

export function hasPermission(role, permission) {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized]?.includes(permission) ?? false;
}

export function permissionsForRole(role) {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized] ? [...ROLE_PERMISSIONS[normalized]] : [];
}

export const ASSIGNABLE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.STAFF,
  ROLES.FINANCE_MANAGER,
  ROLES.DOCTOR,
];
