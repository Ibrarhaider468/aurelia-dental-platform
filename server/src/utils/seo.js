import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { slugify } from "./slug.js";

export function absoluteUrl(pathname = "/") {
  const base = env.publicSiteUrl.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function buildPageSeo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noindex = false,
} = {}) {
  const url = absoluteUrl(path);
  const ogImage = image || absoluteUrl("/og-default.svg");

  return {
    title,
    description,
    canonical: url,
    og: {
      title,
      description,
      url,
      type,
      image: ogImage,
      siteName: "Aurelia Dental",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: ogImage,
    },
    robots: noindex ? "noindex, nofollow" : "index, follow",
  };
}

export function dentalClinicJsonLd(settings) {
  const name = settings.clinicName || "Aurelia Dental";
  const data = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name,
    url: env.publicSiteUrl,
    description:
      settings.seoDescription ||
      "Premium dental clinic offering cosmetic, restorative, and family dentistry.",
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    image: absoluteUrl("/og-default.svg"),
    priceRange: "$$",
    medicalSpecialty: "Dentistry",
  };

  if (settings.address) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: settings.address,
    };
  }

  if (settings.openingHours && typeof settings.openingHours === "object") {
    data.openingHoursSpecification = Object.entries(settings.openingHours)
      .filter(([, hours]) => hours && String(hours).toLowerCase() !== "closed")
      .map(([day, hours]) => {
        const [opens, closes] = String(hours).split("-");
        return {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1).toLowerCase(),
          opens: opens || undefined,
          closes: closes || undefined,
        };
      });
  }

  return data;
}

export function serviceJsonLd(service, settings, { faqs = [] } = {}) {
  const clinic = settings?.clinicName || "Aurelia Dental";
  const graph = [
    {
      "@type": "Service",
      "@id": absoluteUrl(`/treatments/${service.slug}`),
      name: service.title,
      description: service.description,
      url: absoluteUrl(`/treatments/${service.slug}`),
      image: service.image || undefined,
      provider: {
        "@type": "Dentist",
        name: clinic,
        url: env.publicSiteUrl,
      },
      areaServed: settings?.address || undefined,
      serviceType: "Dental care",
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: Number(service.price),
        availability: "https://schema.org/InStock",
        url: absoluteUrl(`/book?serviceId=${service.id}`),
      },
      termsOfService: `${service.duration} minute appointment`,
    },
  ];

  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": absoluteUrl(`/treatments/${service.slug}#faq`),
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function physicianJsonLd(doctor, settings) {
  const clinic = settings?.clinicName || "Aurelia Dental";
  const slug = slugify(doctor.name);
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    url: absoluteUrl(`/dentists/${slug}`),
    image: doctor.image || undefined,
    description: doctor.bio || undefined,
    medicalSpecialty: doctor.specialization || "Dentistry",
    jobTitle: doctor.qualification || "Dentist",
    worksFor: {
      "@type": "Dentist",
      name: clinic,
      url: env.publicSiteUrl,
      telephone: settings?.phone || undefined,
      address: settings?.address
        ? {
            "@type": "PostalAddress",
            streetAddress: settings.address,
          }
        : undefined,
    },
  };
}

export function websiteRoutesForSitemap() {
  return [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/treatments", changefreq: "weekly", priority: "0.9" },
    { path: "/dentists", changefreq: "weekly", priority: "0.8" },
    { path: "/book", changefreq: "monthly", priority: "0.9" },
    { path: "/membership", changefreq: "weekly", priority: "0.7" },
    { path: "/insurance", changefreq: "monthly", priority: "0.7" },
    { path: "/payments", changefreq: "monthly", priority: "0.6" },
  ];
}

export async function buildSitemapEntries() {
  const staticRoutes = websiteRoutesForSitemap();
  const [services, doctors] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      select: { name: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return [
    ...staticRoutes.map((route) => ({
      path: route.path,
      changefreq: route.changefreq,
      priority: route.priority,
      lastmod: new Date().toISOString(),
    })),
    ...services.map((service) => ({
      path: `/treatments/${service.slug}`,
      changefreq: "monthly",
      priority: "0.8",
      lastmod: service.updatedAt.toISOString(),
    })),
    ...doctors.map((doctor) => ({
      path: `/dentists/${slugify(doctor.name)}`,
      changefreq: "monthly",
      priority: "0.75",
      lastmod: doctor.updatedAt.toISOString(),
    })),
  ];
}
