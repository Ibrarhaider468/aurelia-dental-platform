import { motion } from "framer-motion";
import { Sparkles, ShieldPlus, Smile, Baby, Stethoscope, Wand2 } from "lucide-react";
import "./Services.css";

const services = [
  {
    icon: Sparkles,
    title: "Preventive care",
    text: "Cleanings, exams, and guidance that keep small concerns from becoming big ones.",
  },
  {
    icon: Smile,
    title: "Cosmetic smile design",
    text: "Whitening, bonding, and veneers planned for a natural look—not a template smile.",
  },
  {
    icon: ShieldPlus,
    title: "Restorative dentistry",
    text: "Fillings, crowns, and bridges crafted for comfort, strength, and seamless blend.",
  },
  {
    icon: Baby,
    title: "Family & kids",
    text: "Gentle visits for every age, with clear explanations kids and parents can trust.",
  },
  {
    icon: Stethoscope,
    title: "Emergency visits",
    text: "Same-day relief for pain, chips, and unexpected issues when you need it most.",
  },
  {
    icon: Wand2,
    title: "Invisalign & alignment",
    text: "Discreet straightening with digital planning and check-ins that fit your schedule.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Services() {
  return (
    <section id="services" className="section services">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">Services</p>
          <h2 className="section-title">Care shaped around you</h2>
          <p className="section-lead">
            From first cleanings to full smile renewals, every visit starts with
            listening—then a plan you can understand.
          </p>
        </motion.div>

        <motion.ul
          className="services__grid"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {services.map(({ icon: Icon, title, text }) => (
            <motion.li key={title} className="services__item" variants={item}>
              <span className="services__icon" aria-hidden="true">
                <Icon size={22} strokeWidth={1.75} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
