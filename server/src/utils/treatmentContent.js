/**
 * Premium presentation content derived from existing Service fields.
 * Avoids schema changes while keeping pages clinically useful.
 */

const CONTENT_BY_SLUG = {
  "dental-implants": {
    benefits: [
      "Restore missing teeth with a stable, natural-looking foundation",
      "Preserve jawbone health and facial structure",
      "Eat and speak with renewed confidence",
      "Long-lasting results with careful digital planning",
    ],
    steps: [
      "Consultation and digital assessment of bone and bite",
      "Personalized implant plan with clear timelines",
      "Precise implant placement in a calm clinical setting",
      "Healing review and final restoration for a refined finish",
    ],
    faqs: [
      {
        q: "Are dental implants painful?",
        a: "Most patients describe the procedure as comfortable with modern anesthesia. Mild tenderness afterward is common and usually settles quickly with aftercare guidance.",
      },
      {
        q: "How long do implants last?",
        a: "With good oral hygiene and regular reviews, implants are designed as a long-term solution. Longevity depends on bone health, bite forces, and ongoing maintenance.",
      },
      {
        q: "Am I a candidate for implants?",
        a: "Suitability depends on gum health, bone volume, and medical history. We assess this carefully during consultation before recommending a plan.",
      },
    ],
  },
  invisalign: {
    benefits: [
      "Discreet clear aligners for everyday confidence",
      "Removable trays for easier eating and cleaning",
      "Predictable staged progress with clinical reviews",
      "Comfortable alternative to traditional braces for many cases",
    ],
    steps: [
      "Smile assessment and digital impressions",
      "Custom aligner journey mapped with clear milestones",
      "Wear trays as directed with periodic progress checks",
      "Refinement and retainers to protect your new alignment",
    ],
    faqs: [
      {
        q: "How many hours a day should I wear aligners?",
        a: "Most plans recommend around 20–22 hours daily, removing trays only for meals and oral hygiene unless advised otherwise.",
      },
      {
        q: "Will Invisalign affect my speech?",
        a: "A short adjustment period is normal. Most patients adapt within a few days as speech settles.",
      },
      {
        q: "How long does treatment take?",
        a: "Timelines vary by case complexity. Your clinician will outline an expected duration after assessing tooth movement needs.",
      },
    ],
  },
  veneers: {
    benefits: [
      "Refine color, shape, and smile proportion",
      "Custom porcelain crafted for a natural finish",
      "Ideal for chips, gaps, and uneven edges",
      "Results planned with aesthetic balance in mind",
    ],
    steps: [
      "Smile design consultation and shade matching",
      "Minimal preparation where clinically appropriate",
      "Temporary veneers while porcelain is crafted",
      "Precise bonding and final bite refinement",
    ],
    faqs: [
      {
        q: "Do veneers look natural?",
        a: "Yes — when designed carefully. We match translucency, shade, and contour so the result complements your features.",
      },
      {
        q: "How do I care for veneers?",
        a: "Brush and floss as usual, attend regular hygiene visits, and avoid using teeth to open packaging or bite very hard objects.",
      },
      {
        q: "Are veneers reversible?",
        a: "Some preparation is usually required, so veneers are considered a long-term aesthetic commitment. We discuss options before treatment begins.",
      },
    ],
  },
  whitening: {
    benefits: [
      "Brighter shade with clinician-supervised protocols",
      "Options suited to sensitivity and lifestyle",
      "Visible lift for stains from coffee, tea, or aging",
      "Safe approach compared with unregulated kits",
    ],
    steps: [
      "Shade assessment and enamel/gum check",
      "Selection of in-clinic or take-home protocol",
      "Guided whitening session or tray instructions",
      "Aftercare advice to help maintain your new shade",
    ],
    faqs: [
      {
        q: "Will whitening make my teeth sensitive?",
        a: "Temporary sensitivity can occur. We choose formulas and desensitizing support to keep the experience as comfortable as possible.",
      },
      {
        q: "How long do whitening results last?",
        a: "Results vary with diet and habits. Touch-up guidance and good oral hygiene help maintain brightness longer.",
      },
      {
        q: "Can everyone whiten their teeth?",
        a: "Not every case is suitable — especially with untreated decay, gum issues, or certain restorations. We assess first.",
      },
    ],
  },
};

function titleCaseFallback(service) {
  const title = service.title || "Treatment";
  return {
    benefits: [
      `Clinician-led ${title.toLowerCase()} planned around your goals`,
      "Clear explanation of options, timing, and investment",
      "Calm environment with modern diagnostic support",
      "Aftercare guidance for confident recovery",
    ],
    steps: [
      "Consultation to understand your concerns and oral health",
      "Personalized treatment plan with transparent next steps",
      `Careful delivery of your ${title.toLowerCase()} appointment`,
      "Follow-up review and ongoing support where needed",
    ],
    faqs: [
      {
        q: `What happens during a ${title} consultation?`,
        a:
          service.description ||
          "We review your oral health, discuss your goals, and outline suitable options before any treatment begins.",
      },
      {
        q: "How long is the appointment?",
        a: `Typical chair time is about ${service.duration || 45} minutes, though complex cases may need additional visits.`,
      },
      {
        q: "Can I book online?",
        a: "Yes. Choose this treatment in our booking wizard, select a dentist and time, and our team will confirm your visit.",
      },
    ],
  };
}

export function getTreatmentPresentation(service) {
  const preset = CONTENT_BY_SLUG[service.slug] || titleCaseFallback(service);
  return {
    benefits: preset.benefits,
    steps: preset.steps,
    faqs: preset.faqs,
  };
}

export function relatedDoctorsForService(service, doctors, limit = 3) {
  const haystack = `${service.title} ${service.description} ${service.slug}`.toLowerCase();
  const scored = doctors.map((doctor) => {
    const spec = (doctor.specialization || "").toLowerCase();
    let score = 0;
    if (spec && haystack.includes(spec.split(/[&,/]/)[0].trim())) score += 3;
    const tokens = spec.split(/[^a-z]+/).filter((t) => t.length > 3);
    for (const token of tokens) {
      if (haystack.includes(token)) score += 1;
    }
    if (/implant/.test(haystack) && /implant/.test(spec)) score += 4;
    if (/invisalign|aligner|ortho/.test(haystack) && /aligner|ortho/.test(spec))
      score += 4;
    if (/veneer|cosmetic|whitening|smile/.test(haystack) && /cosmetic/.test(spec))
      score += 4;
    if (/family|emergency|hygiene|general/.test(haystack) && /family|general|emergency/.test(spec))
      score += 3;
    return { doctor, score };
  });

  scored.sort((a, b) => b.score - a.score || a.doctor.sortOrder - b.doctor.sortOrder);
  const picked = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.doctor);
  if (picked.length) return picked;
  return doctors.slice(0, limit);
}
