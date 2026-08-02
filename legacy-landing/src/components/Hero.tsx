import { motion } from "framer-motion";
import "./Hero.css";

export default function Hero() {
  return (
    <section id="top" className="hero" aria-label="Welcome">
      <div className="hero__media" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1606811841689-23dfdb7ee46b?auto=format&fit=crop&w=2000&q=80"
          alt=""
        />
        <div className="hero__veil" />
      </div>

      <div className="container hero__content">
        <motion.p
          className="hero__brand"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Aurelia Dental
        </motion.p>

        <motion.h1
          className="hero__title"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          Calm care for lasting smiles
        </motion.h1>

        <motion.p
          className="hero__lead"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          Modern family dentistry in a quiet, light-filled studio—clear plans,
          gentle hands, and treatment that fits your life.
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          <a href="#contact" className="btn btn-primary">
            Book a consultation
          </a>
          <a href="#services" className="btn btn-secondary">
            Explore services
          </a>
        </motion.div>
      </div>
    </section>
  );
}
