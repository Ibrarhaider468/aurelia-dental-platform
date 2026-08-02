export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  DOCTOR: "DOCTOR",
});

export const ALL_STAFF_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.DOCTOR];

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: [
    "users:manage",
    "doctors:manage",
    "services:manage",
    "appointments:manage",
    "patients:manage",
    "payments:manage",
    "memberships:manage",
    "insurance:manage",
    "gallery:manage",
    "testimonials:manage",
    "cms:manage",
    "settings:manage",
  ],
  [ROLES.STAFF]: [
    "doctors:read",
    "services:read",
    "appointments:manage",
    "patients:manage",
    "payments:manage",
    "memberships:read",
    "insurance:read",
    "gallery:read",
    "testimonials:manage",
  ],
  [ROLES.DOCTOR]: [
    "doctors:read",
    "services:read",
    "appointments:read",
    "appointments:update_own",
    "patients:read",
    "availability:manage_own",
  ],
});

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
