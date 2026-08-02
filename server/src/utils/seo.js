import { env } from "../config/env.js";

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
