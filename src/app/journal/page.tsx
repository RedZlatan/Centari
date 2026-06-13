import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
import styles from "./journal.module.css";

const journalEntries = [
  {
    type: "Project story",
    title: "Building systems before they become software",
    summary:
      "Notes from shaping spatial, operational and AI-assisted work into something teams can stand inside.",
    meta: "Company notes / Prototype practice",
  },
  {
    type: "Research commentary",
    title: "Signals are more useful when they become rooms",
    summary:
      "A short observation on research maps, strategic sensing and why spatial context changes how teams read weak signals.",
    meta: "Research / Signal mapping",
  },
  {
    type: "Partner observation",
    title: "The sales demo is becoming an operating environment",
    summary:
      "Complex products need more than slides. They need spaces where buyers can test intent, constraints and future operations.",
    meta: "Partners / XR sales",
  },
  {
    type: "Field note",
    title: "Training systems should feel physical",
    summary:
      "Simulation, rehearsal and learning work best when the body understands what the interface is asking.",
    meta: "Spatial learning / Training",
  },
];

export default function JournalPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <Container>
            <p className={styles.eyebrow}>Centari Journal</p>
            <h1>Notes from before reality.</h1>
            <p className={styles.intro}>
              Company notes, project stories, partner observations and research commentary
              from the work of building physical, spatial and operational systems.
            </p>
          </Container>
        </section>

        <section className={styles.entries} aria-label="Journal entries">
          <Container>
            <div className={styles.grid}>
              {journalEntries.map((entry) => (
                <article className={styles.card} key={entry.title}>
                  <div className={styles.cardTop}>
                    <span>{entry.type}</span>
                    <span>{entry.meta}</span>
                  </div>
                  <h2>{entry.title}</h2>
                  <p>{entry.summary}</p>
                  <span className={styles.placeholder}>Editorial placeholder</span>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.vision} aria-label="Leave a vision">
          <Container>
            <div className={styles.visionPanel}>
              <div>
                <p className={styles.eyebrow}>Leave a vision</p>
                <h2>The Vision Machine remains open.</h2>
                <p>
                  Write what should exist. Your idea becomes a temporary star in the
                  prototype space while the permanent guestbook system is being designed.
                </p>
              </div>
              <a className={styles.visionLink} href="/workspace">
                Enter Vision Machine
              </a>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
