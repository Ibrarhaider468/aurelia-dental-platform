const q = (id: string, w = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const SERVICE_BY_SLUG: Record<string, string> = {
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

const DOCTOR_POOL = [
  q("photo-1559839734-2b71ea197ec2", 900),
  q("photo-1612349317150-e413f6a5b16d", 900),
  q("photo-1594824476967-48c8b964273f", 900),
  q("photo-1537368910025-700350fe46c7", 900),
  q("photo-1622253692010-333f2da6031d", 900),
];

export function money(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function serviceImage(
  service: { slug?: string | null; image?: string | null },
  index = 0,
) {
  if (service.image) return service.image;
  if (service.slug && SERVICE_BY_SLUG[service.slug]) {
    return SERVICE_BY_SLUG[service.slug];
  }
  return SERVICE_POOL[index % SERVICE_POOL.length];
}

export function doctorImage(
  doctor: { image?: string | null },
  index = 0,
) {
  if (doctor.image) return doctor.image;
  return DOCTOR_POOL[index % DOCTOR_POOL.length];
}

export function mediaFallback() {
  return q("photo-1629909613654-28e377c37b09", 800);
}

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=2000&q=80";
