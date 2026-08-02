import { motion } from "framer-motion";
import "./Testimonials.css";

const stories = [
  {
    quote:
      "I used to put off appointments for years. Here, the pace feels human—and my smile finally feels like mine again.",
    name: "Maya R.",
    detail: "Cosmetic bonding",
  },
  {
    quote:
      "Our kids actually ask when the next visit is. That alone tells you everything about this team.",
    name: "Daniel & Priya K.",
    detail: "Family care",
  },
  {
    quote:
      "Clear costs, no surprises, and a crown that looks completely natural. Exactly what I needed.",
    name: "Owen L.",
    detail: "Restorative care",
  },
];

export default function Testimonials() {
  return (
    <section id="stories" className="section stories">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">Patient stories</p>
          <h2 className="section-title">Trusted by neighbors</h2>
          <p className="section-lead">
            Real visits, real relief—words from patients who found a dental home
            at Aurelia.
          </p>
        </motion.div>

        <div className="stories__list">
          {stories.map((story, index) => (
            <motion.blockquote
              key={story.name}
              className="stories__quote"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.6,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <p>“{story.quote}”</p>
              <footer>
                <cite>{story.name}</cite>
                <span>{story.detail}</span>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
