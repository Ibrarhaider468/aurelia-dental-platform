import { AppError } from "./AppError.js";
import { normalizeRole, ROLES } from "../constants/roles.js";

export function isDoctor(user) {
  return normalizeRole(user?.role) === ROLES.DOCTOR;
}

export function requireLinkedDoctor(user) {
  if (!isDoctor(user)) return null;
  if (!user.doctorId) {
    throw new AppError("Doctor profile is not linked to this account", 403);
  }
  return user.doctorId;
}

/** Force doctorId scope for DOCTOR role; leave query alone for others. */
export function scopedDoctorId(user, requestedDoctorId) {
  const ownId = requireLinkedDoctor(user);
  if (ownId) return ownId;
  return requestedDoctorId || undefined;
}

export function assertNotOtherDoctorRecord(user, doctorId) {
  const ownId = requireLinkedDoctor(user);
  if (ownId && doctorId && ownId !== doctorId) {
    throw new AppError("You do not have permission for this action", 403);
  }
}
