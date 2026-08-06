/** Trim trailing slash so paths like `/auth/login` always join cleanly. */
const API_URL = String(import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);

function apiUnreachableMessage() {
  const isRelative = API_URL.startsWith("/");
  if (import.meta.env.PROD && isRelative) {
    return (
      "Cannot reach the API from this host. " +
      "Cloudflare Pages has no /api backend — set VITE_API_URL to your full API URL " +
      "(e.g. https://your-api-host.com/api) in Pages → Settings → Environment variables, then Redeploy."
    );
  }
  if (import.meta.env.PROD) {
    return (
      `Cannot reach the API at ${API_URL}. ` +
      "Check that the backend is online and that CLIENT_URL / CORS allows this admin origin."
    );
  }
  return "Cannot reach the API. Make sure the server is running (port 4000) or Vite proxy is active.";
}

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: { path: string; message: string }[];
};

function getToken() {
  return localStorage.getItem("aurelia_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...options,
      headers,
    });
  } catch {
    throw new Error(apiUnreachableMessage());
  }

  // 304 has no body; treat as a failed/stale auth response so callers can retry cleanly
  if (res.status === 304) {
    throw new Error("Cached response expired. Please refresh and try again.");
  }

  if (res.status === 429) {
    throw new Error("Too many login attempts. Wait a minute and try again.");
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(apiUnreachableMessage());
  }

  const json = (await res.json().catch(() => ({}))) as ApiResponse<T> & {
    message?: string;
  };

  if (!res.ok || json.success === false) {
    const detail = json.errors?.map((e) => e.message).join(", ");
    throw new Error(detail || json.message || "Request failed");
  }

  return json.data;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ user: AuthUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ user: AuthUser }>("/auth/me"),
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "STAFF" | "FINANCE_MANAGER" | "DOCTOR" | "ADMIN";
  isActive?: boolean;
  doctorId?: string | null;
  permissions?: string[];
  customPermissions?: string[];
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AuthUser["role"];
  isActive: boolean;
  doctorId?: string | null;
  doctor?: { id: string; name: string } | null;
  permissions?: string[];
  customPermissions?: string[];
  permissionsCustomized?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const adminApi = {
  dashboard: () => api<DashboardData>("/admin/dashboard"),
  doctors: {
    list: (search?: string) =>
      api<Doctor[]>(`/admin/doctors${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    get: (id: string) => api<Doctor>(`/admin/doctors/${id}`),
    create: (body: Partial<Doctor>) =>
      api<Doctor>("/admin/doctors", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Doctor>) =>
      api<Doctor>(`/admin/doctors/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/doctors/${id}`, { method: "DELETE" }),
    saveAvailability: (id: string, body: AvailabilityInput) =>
      api<Availability>(`/admin/doctors/${id}/availability`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    deleteAvailability: (id: string, availabilityId: string) =>
      api<{ message: string }>(`/admin/doctors/${id}/availability/${availabilityId}`, {
        method: "DELETE",
      }),
  },
  services: {
    list: (search?: string) =>
      api<Service[]>(`/admin/services${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    create: (body: Partial<Service>) =>
      api<Service>("/admin/services", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Service>) =>
      api<Service>(`/admin/services/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/services/${id}`, { method: "DELETE" }),
  },
  appointments: {
    list: (params?: {
      status?: string;
      search?: string;
      doctorId?: string;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      if (params?.doctorId) q.set("doctorId", params.doctorId);
      if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
      if (params?.dateTo) q.set("dateTo", params.dateTo);
      const qs = q.toString();
      return api<Appointment[]>(`/admin/appointments${qs ? `?${qs}` : ""}`);
    },
    calendar: (params?: { from?: string; to?: string; doctorId?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set("from", params.from);
      if (params?.to) q.set("to", params.to);
      if (params?.doctorId) q.set("doctorId", params.doctorId);
      const qs = q.toString();
      return api<Appointment[]>(`/admin/appointments/calendar${qs ? `?${qs}` : ""}`);
    },
    exportUrl: (params?: {
      status?: string;
      search?: string;
      doctorId?: string;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      if (params?.doctorId) q.set("doctorId", params.doctorId);
      if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
      if (params?.dateTo) q.set("dateTo", params.dateTo);
      const qs = q.toString();
      return `${API_URL}/admin/appointments/export${qs ? `?${qs}` : ""}`;
    },
    create: (body: Record<string, unknown>) =>
      api<Appointment>("/admin/appointments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      api<Appointment>(`/admin/appointments/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/appointments/${id}`, { method: "DELETE" }),
  },
  schedule: {
    holidays: () => api<ClinicHoliday[]>("/admin/holidays"),
    createHoliday: (body: { date: string; title: string }) =>
      api<ClinicHoliday>("/admin/holidays", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    deleteHoliday: (id: string) =>
      api<{ message: string }>(`/admin/holidays/${id}`, { method: "DELETE" }),
    leaves: (doctorId?: string) =>
      api<DoctorLeave[]>(
        doctorId
          ? `/admin/doctors/${doctorId}/leaves`
          : "/admin/leaves",
      ),
    createLeave: (doctorId: string, body: { date: string; reason?: string }) =>
      api<DoctorLeave>(`/admin/doctors/${doctorId}/leaves`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    deleteLeave: (doctorId: string, leaveId: string) =>
      api<{ message: string }>(`/admin/doctors/${doctorId}/leaves/${leaveId}`, {
        method: "DELETE",
      }),
  },
  patients: {
    list: (search?: string) =>
      api<Patient[]>(`/admin/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    get: (id: string) => api<PatientDetail>(`/admin/patients/${id}`),
    create: (body: Partial<Patient>) =>
      api<Patient>("/admin/patients", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Patient>) =>
      api<Patient>(`/admin/patients/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/patients/${id}`, { method: "DELETE" }),
    addNote: (id: string, note: string) =>
      api<PatientNote>(`/admin/patients/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
  },
  payments: {
    list: (params?: {
      status?: string;
      search?: string;
      patientId?: string;
      appointmentId?: string;
      method?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.search) q.set("search", params.search);
      if (params?.patientId) q.set("patientId", params.patientId);
      if (params?.appointmentId) q.set("appointmentId", params.appointmentId);
      if (params?.method) q.set("method", params.method);
      const qs = q.toString();
      return api<Payment[]>(`/admin/payments${qs ? `?${qs}` : ""}`);
    },
    finance: () => api<FinanceStats>("/admin/finance"),
    create: (body: Record<string, unknown>) =>
      api<Payment>("/admin/payments", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      api<Payment>(`/admin/payments/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/payments/${id}`, { method: "DELETE" }),
    checkout: (id: string, body: Record<string, unknown>) =>
      api<{ payment: Payment; checkout: Record<string, unknown> }>(
        `/admin/payments/${id}/checkout`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  },
  memberships: {
    list: () => api<MembershipPlan[]>("/admin/membership-plans"),
    subscriptions: () => api<MembershipSubscription[]>("/admin/memberships"),
    create: (body: Record<string, unknown>) =>
      api<MembershipPlan>("/admin/membership-plans", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      api<MembershipPlan>(`/admin/membership-plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/membership-plans/${id}`, { method: "DELETE" }),
    subscribe: (body: Record<string, unknown>) =>
      api<{ subscription: MembershipSubscription; payment: Payment }>(
        "/admin/memberships/subscribe",
        { method: "POST", body: JSON.stringify(body) },
      ),
    updateSubscription: (id: string, status: string) =>
      api<MembershipSubscription>(`/admin/memberships/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
  },
  insurance: {
    list: () => api<InsuranceProvider[]>("/admin/insurance"),
    create: (body: Record<string, unknown>) =>
      api<InsuranceProvider>("/admin/insurance", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      api<InsuranceProvider>(`/admin/insurance/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/insurance/${id}`, { method: "DELETE" }),
    patientList: () => api<PatientInsurance[]>("/admin/patient-insurance"),
    createPatient: (body: Record<string, unknown>) =>
      api<PatientInsurance>("/admin/patient-insurance", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updatePatient: (id: string, body: Record<string, unknown>) =>
      api<PatientInsurance>(`/admin/patient-insurance/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    removePatient: (id: string) =>
      api<{ message: string }>(`/admin/patient-insurance/${id}`, {
        method: "DELETE",
      }),
  },
  gallery: {
    list: () => api<GalleryItem[]>("/admin/gallery"),
    create: (body: Record<string, unknown>) =>
      api<GalleryItem>("/admin/gallery", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      api<GalleryItem>(`/admin/gallery/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/gallery/${id}`, { method: "DELETE" }),
  },
  testimonials: {
    list: () => api<Testimonial[]>("/admin/testimonials"),
    create: (body: Record<string, unknown>) =>
      api<Testimonial>("/admin/testimonials", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      api<Testimonial>(`/admin/testimonials/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/testimonials/${id}`, { method: "DELETE" }),
  },
  settings: {
    get: () => api<Settings>("/admin/settings"),
    update: (body: Partial<Settings>) =>
      api<Settings>("/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
  },
  faqs: {
    list: () => api<Faq[]>("/admin/faqs"),
    create: (body: Record<string, unknown>) =>
      api<Faq>("/admin/faqs", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      api<Faq>(`/admin/faqs/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/faqs/${id}`, { method: "DELETE" }),
  },
  contactMessages: {
    list: (params?: { search?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.status) query.set("status", params.status);
      const suffix = query.toString() ? `?${query}` : "";
      return api<ContactMessage[]>(`/admin/contact-messages${suffix}`);
    },
    get: (id: string) => api<ContactMessage>(`/admin/contact-messages/${id}`),
    updateStatus: (id: string, status: string) =>
      api<ContactMessage>(`/admin/contact-messages/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/contact-messages/${id}`, {
        method: "DELETE",
      }),
  },
  users: {
    list: (search?: string) =>
      api<AdminUser[]>(
        `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
    get: (id: string) => api<AdminUser>(`/admin/users/${id}`),
    create: (body: Record<string, unknown>) =>
      api<AdminUser>("/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Record<string, unknown>) =>
      api<AdminUser>(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" }),
  },
};

export type FinanceStats = {
  totalRevenue: number;
  pendingPaymentsAmount: number;
  pendingPaymentsCount: number;
  refundedAmount: number;
  refundedCount: number;
  failedPaymentsCount: number;
  membershipRevenue: number;
  paidAppointments: number;
  monthlyRevenue: number;
  monthLabel: string;
  recentPayments: Payment[];
};

export type DashboardData = {
  totalAppointments: number;
  todaysAppointments: number;
  totalPatients: number;
  revenue: number;
  pendingRequests: number;
  activeDoctors: number;
  activeMemberships?: number;
  finance?: FinanceStats;
  recentAppointments: Appointment[];
};

export type Availability = {
  id: string;
  doctorId: string;
  day: string;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  slotMinutes: number;
  isActive: boolean;
};

export type AvailabilityInput = {
  day: string;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  slotMinutes?: number;
  isActive?: boolean;
};

export type Doctor = {
  id: string;
  name: string;
  image?: string | null;
  qualification?: string | null;
  experience?: number | null;
  specialization?: string | null;
  bio?: string | null;
  isActive: boolean;
  sortOrder: number;
  availabilities?: Availability[];
  _count?: { appointments: number };
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image?: string | null;
  duration: number;
  price: string | number;
  isActive: boolean;
  sortOrder: number;
};

export type Appointment = {
  id: string;
  patientName: string;
  email: string;
  phone: string;
  doctorId: string;
  serviceId: string;
  date: string;
  slot: string;
  message?: string | null;
  status: string;
  doctor?: { id: string; name: string };
  service?: { id: string; title: string; price?: string | number };
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  medicalNotes?: string | null;
  _count?: { appointments: number; payments: number; memberships: number };
};

export type PatientNote = {
  id: string;
  note: string;
  createdBy?: string | null;
  createdAt: string;
};

export type PatientMembershipSummary = {
  id: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  plan?: { id: string; name: string; price?: string | number };
};

export type PatientDetail = Patient & {
  appointments: Appointment[];
  payments: Payment[];
  memberships: PatientMembershipSummary[];
  insuranceDetails?: PatientInsurance[];
  clinicalNotes?: PatientNote[];
  previousTreatments?: string[];
};

export type ClinicHoliday = {
  id: string;
  date: string;
  title: string;
};

export type DoctorLeave = {
  id: string;
  doctorId: string;
  date: string;
  reason?: string | null;
  doctor?: { id: string; name: string };
};

export type Payment = {
  id: string;
  amount: string | number;
  currency?: string;
  method: string;
  status: string;
  gateway?: string;
  providerRef?: string | null;
  notes?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  membershipId?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  patient?: { id: string; name: string; email?: string };
  appointment?: { id: string; date: string; slot?: string; status?: string };
};

export type MembershipPlan = {
  id: string;
  name: string;
  price: string | number;
  billingCycle: string;
  durationMonths?: number;
  benefits: string[];
  includedTreatments?: string[];
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { subscriptions: number };
};

export type MembershipSubscription = {
  id: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  patient?: { id: string; name: string; email?: string };
  plan?: MembershipPlan;
};

export type InsuranceProvider = {
  id: string;
  name: string;
  details: string;
  acceptedPlans?: string[];
  logo?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type PatientInsurance = {
  id: string;
  patientId: string;
  providerId: string;
  policyNumber: string;
  groupNumber?: string | null;
  holderName?: string | null;
  status: string;
  notes?: string | null;
  patient?: { id: string; name: string; email?: string };
  provider?: { id: string; name: string };
};

export type GalleryItem = {
  id: string;
  beforeImage: string;
  afterImage: string;
  treatment: string;
  caption?: string | null;
  isPublished: boolean;
  sortOrder: number;
};

export type Testimonial = {
  id: string;
  patientName: string;
  review: string;
  rating: number;
  isApproved: boolean;
  sortOrder: number;
};

export type Settings = {
  id: string;
  clinicName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  openingHours?: Record<string, string> | null;
  logo?: string | null;
  socialLinks?: Record<string, string> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  aboutContent?: string | null;
  mapEmbedUrl?: string | null;
  whatsappNumber?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  mailFrom?: string | null;
  smtpConfigured?: boolean;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  sortOrder: number;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "NEW" | "READ" | "REPLIED" | string;
  createdAt: string;
  updatedAt: string;
};

/** Public website bundle from GET /api/public/website */
export type WebsiteBundle = {
  settings: Settings;
  services: Service[];
  doctors: Doctor[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  insurance: InsuranceProvider[];
  memberships: MembershipPlan[];
  faqs: Faq[];
  paymentOptions: {
    currency?: string;
    methods?: { code: string; label: string }[];
    supportedMethods?: string[];
    stripeConfigured?: boolean;
    paypalConfigured?: boolean;
  };
};

export type SlotBoardItem = {
  time: string;
  status: "available" | "booked" | "past" | string;
  available: boolean;
};

export const publicApi = {
  website: () => api<WebsiteBundle>("/public/website"),
  slots: (doctorId: string, date: string) =>
    api<{
      available?: string[];
      slotBoard?: SlotBoardItem[];
      slots?: string[];
    }>(`/public/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(date)}`),
  book: (body: Record<string, unknown>) =>
    api<{ appointment?: Appointment; message?: string }>("/public/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  contact: (body: Record<string, unknown>) =>
    api<{ message?: string }>("/public/contact", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  subscribe: (body: Record<string, unknown>) =>
    api<{ message?: string }>("/public/memberships/subscribe", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
