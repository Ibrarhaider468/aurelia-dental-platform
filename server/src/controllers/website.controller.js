import { asyncHandler } from "../utils/asyncHandler.js";
import * as publicService from "../services/public.service.js";
import {
  buildPageSeo,
  dentalClinicJsonLd,
  physicianJsonLd,
  serviceJsonLd,
} from "../utils/seo.js";
import { slugify } from "../utils/slug.js";

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDay(day) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function pageLocals(req, data, page, seoInput, extras = {}) {
  const seo = buildPageSeo(seoInput);
  return {
    page,
    ...data,
    ...seo,
    structuredData:
      extras.structuredData !== undefined
        ? extras.structuredData
        : dentalClinicJsonLd(data.settings),
    helpers: {
      money,
      formatDay,
      doctorPath: publicService.publicDoctorPath,
    },
    query: req.query,
    currentPath: seoInput.path || "/",
    ...extras,
  };
}

export const renderHome = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render(
    "pages/home",
    pageLocals(req, data, "home", {
      title: data.settings.seoTitle || `${clinic} | Premium Dental Clinic`,
      description:
        data.settings.seoDescription ||
        "Premium dental care including cosmetic dentistry, implants, hygiene, and family dentistry.",
      path: "/",
      image: data.settings.heroImage || undefined,
    }),
  );
});

export const renderBooking = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render("pages/booking", {
    ...pageLocals(req, data, "booking", {
      title: `Book Dental Appointment | ${clinic}`,
      description:
        "Book a dental consultation online. Choose treatment, dentist, date, and available time slots.",
      path: "/book",
    }),
    preselect: {
      serviceId: req.query.serviceId || "",
      doctorId: req.query.doctorId || "",
    },
  });
});

export const renderTreatments = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render(
    "pages/treatments",
    pageLocals(req, data, "treatments", {
      title: `Dental Treatments | ${clinic}`,
      description:
        "Explore cosmetic dentistry, implants, Invisalign, hygiene, and restorative treatments.",
      path: "/treatments",
    }),
  );
});

export const renderTreatmentDetail = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const detail = await publicService.getPublicServiceBySlug(req.params.slug);
  const clinic = data.settings.clinicName || "Aurelia Dental";
  const { service, benefits, steps, faqs, relatedDoctors } = detail;
  const description =
    service.description.length > 155
      ? `${service.description.slice(0, 152).trim()}…`
      : service.description;

  res.render(
    "pages/treatment-detail",
    pageLocals(
      req,
      data,
      "treatment-detail",
      {
        title: `${service.title} | ${clinic}`,
        description,
        path: `/treatments/${service.slug}`,
        image: service.image || undefined,
        type: "article",
      },
      {
        service,
        benefits,
        steps,
        faqs,
        relatedDoctors,
        structuredData: serviceJsonLd(service, data.settings, { faqs }),
      },
    ),
  );
});

export const renderDoctors = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render(
    "pages/doctors",
    pageLocals(req, data, "doctors", {
      title: `Our Dentists | ${clinic}`,
      description:
        "Meet our dentists, specialties, and clinic availability for your next visit.",
      path: "/dentists",
    }),
  );
});

export const renderDoctorDetail = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const doctor = await publicService.getPublicDoctorBySlug(req.params.slug);
  const clinic = data.settings.clinicName || "Aurelia Dental";
  const slug = slugify(doctor.name);
  const description =
    doctor.bio ||
    `${doctor.name} — ${doctor.specialization || "Dentistry"} at ${clinic}. Book an appointment online.`;

  res.render(
    "pages/doctor-detail",
    pageLocals(
      req,
      data,
      "doctor-detail",
      {
        title: `${doctor.name} | ${clinic}`,
        description:
          description.length > 155
            ? `${description.slice(0, 152).trim()}…`
            : description,
        path: `/dentists/${slug}`,
        image: doctor.image || undefined,
        type: "profile",
      },
      {
        doctor,
        structuredData: physicianJsonLd(doctor, data.settings),
      },
    ),
  );
});

export const renderPayments = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render(
    "pages/payments",
    pageLocals(req, data, "payments", {
      title: `Payment Options | ${clinic}`,
      description:
        "Flexible dental payment options including cards, wallets, insurance billing, and memberships.",
      path: "/payments",
    }),
  );
});

export const renderMembership = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render(
    "pages/membership",
    pageLocals(req, data, "membership", {
      title: `Dental Membership Plans | ${clinic}`,
      description:
        "Monthly and annual dental membership plans with preventive care benefits.",
      path: "/membership",
    }),
  );
});

export const renderInsurance = asyncHandler(async (req, res) => {
  const data = await publicService.getWebsiteData();
  const clinic = data.settings.clinicName || "Aurelia Dental";
  res.render(
    "pages/insurance",
    pageLocals(req, data, "insurance", {
      title: `Dental Insurance | ${clinic}`,
      description:
        "Accepted dental insurance providers and plans. Ask our team about coverage verification.",
      path: "/insurance",
    }),
  );
});
