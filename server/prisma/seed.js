import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@aureliadental.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  const adminName = process.env.ADMIN_NAME || "Clinic Admin";

  const password = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      password,
      role: "SUPER_ADMIN",
    },
  });

  await prisma.settings.upsert({
    where: { id: "clinic" },
    update: {
      clinicName: "Aurelia Dental",
      phone: "+1 (555) 019-2840",
      email: "hello@aureliadental.com",
      address: "214 Harbor Lane, Suite 120, Harbor City",
      openingHours: {
        monday: "09:00-17:00",
        tuesday: "09:00-17:00",
        wednesday: "09:00-17:00",
        thursday: "09:00-17:00",
        friday: "09:00-16:00",
        saturday: "09:00-13:00",
        sunday: "Closed",
      },
      heroTitle: "Quiet luxury in modern dentistry",
      heroSubtitle:
        "A refined clinical experience with personal treatment plans, digital diagnostics, and calm, considered care.",
      aboutContent:
        "Aurelia Dental is an independent premium clinic focused on cosmetic, restorative, and family dentistry delivered with discretion and precision.",
      seoTitle: "Aurelia Dental | Premium Dental Clinic",
      seoDescription:
        "Luxury dental care including implants, Invisalign, veneers, whitening, smile makeovers, and family dentistry.",
      whatsappNumber: "+15550192840",
      socialLinks: {
        instagram: "https://instagram.com/",
        facebook: "https://facebook.com/",
        linkedin: "https://linkedin.com/",
      },
    },
    create: {
      id: "clinic",
      clinicName: "Aurelia Dental",
      phone: "+1 (555) 019-2840",
      email: "hello@aureliadental.com",
      address: "214 Harbor Lane, Suite 120, Harbor City",
      openingHours: {
        monday: "09:00-17:00",
        tuesday: "09:00-17:00",
        wednesday: "09:00-17:00",
        thursday: "09:00-17:00",
        friday: "09:00-16:00",
        saturday: "09:00-13:00",
        sunday: "Closed",
      },
      heroTitle: "Quiet luxury in modern dentistry",
      heroSubtitle:
        "A refined clinical experience with personal treatment plans, digital diagnostics, and calm, considered care.",
      aboutContent:
        "Aurelia Dental is an independent premium clinic focused on cosmetic, restorative, and family dentistry delivered with discretion and precision.",
      seoTitle: "Aurelia Dental | Premium Dental Clinic",
      seoDescription:
        "Luxury dental care including implants, Invisalign, veneers, whitening, smile makeovers, and family dentistry.",
      whatsappNumber: "+15550192840",
      socialLinks: {
        instagram: "https://instagram.com/",
        facebook: "https://facebook.com/",
        linkedin: "https://linkedin.com/",
      },
    },
  });

  const doctorSeeds = [
    {
      name: "Dr. Elena Hart",
      qualification: "DDS, MSc Cosmetic Dentistry",
      experience: 14,
      specialization: "Cosmetic Dentistry",
      bio: "Dr. Hart specializes in smile design, veneers, and whitening with a meticulous, art-led approach.",
      image:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
      sortOrder: 1,
      days: ["MONDAY", "WEDNESDAY", "FRIDAY"],
    },
    {
      name: "Dr. Marcus Chen",
      qualification: "DMD, Implantology Certificate",
      experience: 16,
      specialization: "Implant & Restorative",
      bio: "Dr. Chen focuses on dental implants and complex restorative cases using digital planning and 3D imaging.",
      image:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80",
      sortOrder: 2,
      days: ["TUESDAY", "THURSDAY"],
    },
    {
      name: "Dr. Sofia Alvarez",
      qualification: "BDS, Orthodontics",
      experience: 11,
      specialization: "Aligners & Orthodontics",
      bio: "Dr. Alvarez designs discreet Invisalign journeys with clear milestones and comfortable progress reviews.",
      image:
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=900&q=80",
      sortOrder: 3,
      days: ["MONDAY", "SATURDAY"],
    },
    {
      name: "Dr. James Whitfield",
      qualification: "DDS, Family Dentistry",
      experience: 18,
      specialization: "Family & Emergency Care",
      bio: "Dr. Whitfield provides attentive family dentistry and same-day emergency triage with a calm bedside manner.",
      image:
        "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=900&q=80",
      sortOrder: 4,
      days: ["WEDNESDAY", "FRIDAY"],
    },
  ];

  for (const seed of doctorSeeds) {
    const existing = await prisma.doctor.findFirst({ where: { name: seed.name } });
    if (existing) {
      await prisma.doctor.update({
        where: { id: existing.id },
        data: {
          qualification: seed.qualification,
          experience: seed.experience,
          specialization: seed.specialization,
          bio: seed.bio,
          image: seed.image,
          sortOrder: seed.sortOrder,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.doctor.create({
      data: {
        name: seed.name,
        qualification: seed.qualification,
        experience: seed.experience,
        specialization: seed.specialization,
        bio: seed.bio,
        image: seed.image,
        sortOrder: seed.sortOrder,
        availabilities: {
          create: seed.days.map((day) => ({
            day,
            startTime: day === "SATURDAY" ? "09:00" : "09:00",
            endTime: day === "SATURDAY" ? "13:00" : day === "FRIDAY" ? "16:00" : "17:00",
            breakStart: day === "SATURDAY" ? null : "13:00",
            breakEnd: day === "SATURDAY" ? null : "14:00",
            slotMinutes: 30,
          })),
        },
      },
    });
  }

  const roleUsers = [
    {
      email: "staff@aureliadental.com",
      name: "Clinic Staff",
      role: "STAFF",
      password: "Staff123!",
    },
    {
      email: "finance@aureliadental.com",
      name: "Finance Manager",
      role: "FINANCE_MANAGER",
      password: "Finance123!",
    },
    {
      email: "doctor@aureliadental.com",
      name: "Dr. Elena Hart",
      role: "DOCTOR",
      password: "Doctor123!",
      linkDoctorName: "Dr. Elena Hart",
    },
  ];

  for (const account of roleUsers) {
    const hashed = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        isActive: true,
        password: hashed,
      },
      create: {
        name: account.name,
        email: account.email,
        role: account.role,
        password: hashed,
        isActive: true,
      },
    });

    if (account.linkDoctorName) {
      const doctor = await prisma.doctor.findFirst({
        where: { name: account.linkDoctorName },
      });
      if (doctor) {
        await prisma.doctor.updateMany({
          where: { userId: user.id, id: { not: doctor.id } },
          data: { userId: null },
        });
        await prisma.doctor.update({
          where: { id: doctor.id },
          data: { userId: user.id },
        });
      }
    }
  }

  const serviceSeeds = [
    {
      title: "Dental Implants",
      slug: "dental-implants",
      description:
        "Restore missing teeth with durable, natural-looking implants planned using digital diagnostics.",
      duration: 90,
      price: 2200,
      image:
        "https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 1,
    },
    {
      title: "Invisalign",
      slug: "invisalign",
      description:
        "Discreet clear aligners with staged reviews for a confident, gradual smile transformation.",
      duration: 45,
      price: 3500,
      image:
        "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 2,
    },
    {
      title: "Veneers",
      slug: "veneers",
      description:
        "Custom porcelain veneers crafted for balanced proportion, color harmony, and lasting refinement.",
      duration: 75,
      price: 1200,
      image:
        "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 3,
    },
    {
      title: "Teeth Whitening",
      slug: "teeth-whitening",
      description:
        "Professional whitening for a brighter smile with shade guidance tailored to your enamel.",
      duration: 60,
      price: 450,
      image:
        "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 4,
    },
    {
      title: "Smile Makeover",
      slug: "smile-makeover",
      description:
        "A comprehensive cosmetic plan combining whitening, veneers, or aligners for a complete refresh.",
      duration: 90,
      price: 4800,
      image:
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 5,
    },
    {
      title: "Cosmetic Dentistry",
      slug: "cosmetic-dentistry",
      description:
        "Aesthetic enhancements designed around facial harmony, from contouring to restorative beauty work.",
      duration: 60,
      price: 650,
      image:
        "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 6,
    },
    {
      title: "Emergency Dentistry",
      slug: "emergency-dentistry",
      description:
        "Prompt assessment and relief for dental pain, trauma, or unexpected issues when you need care quickly.",
      duration: 45,
      price: 220,
      image:
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 7,
    },
    {
      title: "Family Dentistry",
      slug: "family-dentistry",
      description:
        "Gentle preventive and restorative care for every age — exams, hygiene, and long-term oral health.",
      duration: 45,
      price: 180,
      image:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1000&q=80",
      sortOrder: 8,
    },
  ];

  for (const seed of serviceSeeds) {
    const existing = await prisma.service.findFirst({
      where: { OR: [{ slug: seed.slug }, { title: seed.title }] },
    });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: { ...seed, isActive: true },
      });
    } else {
      await prisma.service.create({ data: seed });
    }
  }

  if ((await prisma.gallery.count()) === 0) {
    await prisma.gallery.createMany({
      data: [
        {
          treatment: "Porcelain Veneers",
          caption: "Balanced brightness and symmetry across the smile line.",
          beforeImage:
            "https://images.unsplash.com/photo-1588776814546-daab30f310ce?auto=format&fit=crop&w=800&q=70",
          afterImage:
            "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=800&q=70",
          isPublished: true,
          sortOrder: 1,
        },
        {
          treatment: "Invisalign Alignment",
          caption: "Discreet correction for crowding with a natural finish.",
          beforeImage:
            "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=800&q=70",
          afterImage:
            "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=800&q=70",
          isPublished: true,
          sortOrder: 2,
        },
        {
          treatment: "Whitening Refresh",
          caption: "A brighter, even shade while preserving enamel health.",
          beforeImage:
            "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=800&q=70",
          afterImage:
            "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=70",
          isPublished: true,
          sortOrder: 3,
        },
      ],
    });
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          patientName: "Amelia R.",
          review:
            "Every visit felt unhurried and considered. My veneers look completely natural — I leave feeling genuinely cared for.",
          rating: 5,
          isApproved: true,
          sortOrder: 1,
        },
        {
          patientName: "Daniel K.",
          review:
            "The implant process was explained with complete clarity. Digital planning gave me confidence from the first consultation.",
          rating: 5,
          isApproved: true,
          sortOrder: 2,
        },
        {
          patientName: "Priya S.",
          review:
            "Invisalign with Dr. Alvarez was seamless. The clinic atmosphere is calm, modern, and beautifully private.",
          rating: 5,
          isApproved: true,
          sortOrder: 3,
        },
      ],
    });
  }

  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: [
        {
          question: "How do I book my first appointment?",
          answer:
            "Use our online booking journey to choose a treatment, dentist, date, and time. You will receive a pending confirmation while our team reviews the request.",
          sortOrder: 1,
        },
        {
          question: "Do you accept dental insurance?",
          answer:
            "Yes. We work with major providers and can help verify benefits. Bring your policy details to your consultation or share them during booking.",
          sortOrder: 2,
        },
        {
          question: "What should I expect on my first visit?",
          answer:
            "A thorough consultation, discussion of your goals, and a clear treatment plan with timing and investment options — never rushed.",
          sortOrder: 3,
        },
        {
          question: "Are membership plans worth it?",
          answer:
            "Memberships are ideal for ongoing prevention, priority booking, and member discounts. Compare monthly and annual plans on our membership page.",
          sortOrder: 4,
        },
      ],
    });
  }

  const membershipSeeds = [
    {
      name: "Monthly Care",
      price: 49,
      billingCycle: "monthly",
      durationMonths: 1,
      benefits: [
        "Two hygiene visits per year (pro-rated)",
        "Priority booking windows",
        "10% off selected treatments",
      ],
      includedTreatments: ["Hygiene", "Routine exam"],
      description: "Flexible monthly membership for ongoing preventive care.",
      sortOrder: 1,
    },
    {
      name: "Annual Care",
      price: 480,
      billingCycle: "annual",
      durationMonths: 12,
      benefits: [
        "Two full hygiene appointments",
        "Annual comprehensive exam",
        "Emergency triage advice",
        "15% off whitening and cosmetic consults",
      ],
      includedTreatments: ["Hygiene", "Exam", "X-ray review"],
      description: "Best value annual plan for continuous dental wellness.",
      sortOrder: 2,
    },
  ];

  for (const seed of membershipSeeds) {
    const existing = await prisma.membershipPlan.findFirst({
      where: { name: seed.name },
    });
    if (existing) {
      await prisma.membershipPlan.update({
        where: { id: existing.id },
        data: { ...seed, isActive: true },
      });
    } else {
      await prisma.membershipPlan.create({ data: seed });
    }
  }

  const insuranceSeeds = [
    {
      name: "Delta Dental",
      details:
        "Widely accepted PPO and HMO dental cover for routine and restorative care. Our team helps verify benefits before treatment.",
      acceptedPlans: ["PPO", "HMO", "Premier"],
      sortOrder: 1,
    },
    {
      name: "Cigna Dental",
      details:
        "Accepted for preventive, basic, and major dental procedures subject to policy terms and network rules.",
      acceptedPlans: ["DPPO", "DHMO"],
      sortOrder: 2,
    },
    {
      name: "MetLife Dental",
      details:
        "Network benefits available for exams, cleanings, and selected specialty care with transparent verification.",
      acceptedPlans: ["PDP Plus", "Federal"],
      sortOrder: 3,
    },
  ];

  for (const seed of insuranceSeeds) {
    const existing = await prisma.insuranceProvider.findFirst({
      where: { name: seed.name },
    });
    if (existing) {
      await prisma.insuranceProvider.update({
        where: { id: existing.id },
        data: { ...seed, isActive: true },
      });
    } else {
      await prisma.insuranceProvider.create({ data: seed });
    }
  }

  console.log("Seed complete:");
  console.log(`  SUPER_ADMIN: ${admin.email} / ${adminPassword}`);
  console.log("  STAFF: staff@aureliadental.com / Staff123!");
  console.log("  FINANCE_MANAGER: finance@aureliadental.com / Finance123!");
  console.log("  DOCTOR: doctor@aureliadental.com / Doctor123! (linked to Dr. Elena Hart)");
  console.log(`  Doctors: ${await prisma.doctor.count()}`);
  console.log(`  Services: ${await prisma.service.count()}`);
  console.log(`  Gallery: ${await prisma.gallery.count()}`);
  console.log(`  Testimonials: ${await prisma.testimonial.count()}`);
  console.log(`  FAQs: ${await prisma.faq.count()}`);
  console.log(`  Membership plans: ${await prisma.membershipPlan.count()}`);
  console.log(`  Insurance providers: ${await prisma.insuranceProvider.count()}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
