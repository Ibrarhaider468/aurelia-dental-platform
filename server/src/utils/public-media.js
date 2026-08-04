/**
 * Public-site presentation media (view layer only).
 * Does not write to the database — unique verified premium image URLs
 * so the frontend never renders broken/empty placeholders.
 */

const q = (id, w = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Unique treatment images by slug — never reused in gallery. */
const SERVICE_BY_SLUG = {
  "dental-implants": q("photo-1629909615184-74f495363b67"),
  invisalign: q("photo-1607613009820-a29f7bb81c04"),
  veneers: q("photo-1588776814546-1ffcf47267a5"),
  "teeth-whitening": q("photo-1606811971618-4486d14f3f99"),
  "smile-makeover": q("photo-1579684453423-f84349ef60b0"),
  "cosmetic-dentistry": q("photo-1598256989800-fe5f95da9787"),
  "emergency-dentistry": q("photo-1519494026892-80bbd2d6fd0d"),
  "family-dentistry": q("photo-1684607633138-6cc13613369b"),
};

const SERVICE_POOL = [
  q("photo-1576091160399-112ba8d25d1d"),
  q("photo-1576091160550-2173dba999ef"),
  q("photo-1612277795421-9bc7706a4a34"),
  q("photo-1516549655169-df83a0774514"),
];

/** Doctor portrait fallbacks — unique. */
const DOCTOR_POOL = [
  q("photo-1559839734-2b71ea197ec2", 900),
  q("photo-1612349317150-e413f6a5b16d", 900),
  q("photo-1594824476967-48c8b964273f", 900),
  q("photo-1537368910025-700350fe46c7", 900),
  q("photo-1622253692010-333f2da6031d", 900),
];

/**
 * Treatment-specific before/after cases (dental/smile focused).
 * Never reuses SERVICE_BY_SLUG clinic/procedure card photos.
 */
const GALLERY_BY_TREATMENT = {
  veneer: {
    // Clinical side-by-side plate — CSS crops left/right halves
    before: q("photo-1776400985210-92f654712d30", 1600),
    after: q("photo-1776400985210-92f654712d30", 1600),
    split: true,
  },
  invisalign: {
    before: q("photo-1494790108377-be9c29b29330", 900),
    after: q("photo-1777793636393-a0fec488f3fb", 900),
  },
  align: {
    before: q("photo-1494790108377-be9c29b29330", 900),
    after: q("photo-1777793636393-a0fec488f3fb", 900),
  },
  whiten: {
    before: q("photo-1684607633024-f1a2179118fa", 900),
    after: q("photo-1684607633024-f1a2179118fa", 900),
    tone: "whiten",
  },
  bleach: {
    before: q("photo-1684607633024-f1a2179118fa", 900),
    after: q("photo-1684607633024-f1a2179118fa", 900),
    tone: "whiten",
  },
  smile: {
    before: q("photo-1776400985210-92f654712d30", 1600),
    after: q("photo-1776400985210-92f654712d30", 1600),
    split: true,
  },
};

/** Fallback ordered cases if treatment name does not match. */
const GALLERY_CASES = [
  GALLERY_BY_TREATMENT.veneer,
  GALLERY_BY_TREATMENT.invisalign,
  GALLERY_BY_TREATMENT.whiten,
];

const CLINIC_FALLBACK = q("photo-1629909613654-28e377c37b09", 1600);

function looksBroken(url) {
  if (!url || typeof url !== "string") return true;
  return (
    url.includes("photo-1606811841689-23eaabb5a6b0") ||
    url.includes("photo-1588776813658-606aa85bdfc5") ||
    url.includes("photo-1606811841689-23dfdb7ee46b")
  );
}

function matchGalleryCase(treatment = "") {
  const key = String(treatment).toLowerCase();
  for (const [token, images] of Object.entries(GALLERY_BY_TREATMENT)) {
    if (key.includes(token)) return images;
  }
  return null;
}

export function serviceImage(service, index = 0) {
  const slug = service?.slug || "";
  if (SERVICE_BY_SLUG[slug]) return SERVICE_BY_SLUG[slug];
  if (service?.image && !looksBroken(service.image)) return service.image;
  return SERVICE_POOL[index % SERVICE_POOL.length];
}

export function doctorImage(doctor, index = 0) {
  if (doctor?.image && !looksBroken(doctor.image)) return doctor.image;
  return DOCTOR_POOL[index % DOCTOR_POOL.length];
}

export function galleryImages(item, index = 0) {
  const matched = matchGalleryCase(item?.treatment || item?.title || "");
  if (matched) return matched;
  return GALLERY_CASES[index % GALLERY_CASES.length];
}

export function clinicImage() {
  return CLINIC_FALLBACK;
}

export function mediaFallback(kind = "clinic") {
  if (kind === "doctor") return DOCTOR_POOL[0];
  if (kind === "service") return SERVICE_POOL[0];
  return CLINIC_FALLBACK;
}
