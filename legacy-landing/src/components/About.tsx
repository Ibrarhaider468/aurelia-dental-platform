import { motion } from "framer-motion";
import "./About.css";

export default function About() {
  return (
    <section id="about" className="section about">
      <div className="container about__layout">
        <motion.div
          className="about__visual"
          initial={{ opacity: 0, scale: 1.03 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=80"
            alt="Bright dental treatment room with natural light"
          />
        </motion.div>

        <motion.div
          className="about__copy"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">About</p>
          <h2 className="section-title">A quieter way to visit the dentist</h2>
          <p className="section-lead">
            Aurelia was built for people who want excellent clinical care without
            the rush. Soft lighting, unhurried appointments, and a team that
            explains every step in plain language.
          </p>
          <ul className="about__points">
            <li>Digital diagnostics for precise, comfortable treatment</li>
            <li>Transparent pricing before any work begins</li>
            <li>Evening hours for busy families and professionals</li>
          </ul>
          <a href="#contact" className="btn btn-ghost">
            Meet the team
          </a>
        </motion.div>
      </div>
    </section>
  );
}
