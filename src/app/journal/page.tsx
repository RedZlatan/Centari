import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
import styles from "./journal.module.css";

const roadEntries = [
  {
    type: "Project story",
    title: "Building systems before they become software",
    summary:
      "Notes from shaping spatial, operational and AI-assisted work into something teams can stand inside.",
    meta: "Company notes / Prototype practice",
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

const researchEntries = [
  {
    type: "Research commentary",
    title: "Signals are more useful when they become rooms",
    summary:
      "A short observation on research maps, strategic sensing and why spatial context changes how teams read weak signals.",
    meta: "Research / Signal mapping",
  },
  {
    type: "Research commentary",
    title: "The edge of the map is where the work starts",
    summary:
      "Most organisations track what is already known. The useful signal is what sits just outside established understanding.",
    meta: "Research / Future Atlas",
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
              Company notes, project stories and research commentary from the work of
              building physical, spatial and operational systems.
            </p>
          </Container>
        </section>

        <section className={styles.category} aria-label="Road to Centari">
          <Container>
            <div className={styles.categoryHeader}>
              <p className={styles.categoryLabel}>Road to Centari</p>
              <p className={styles.categoryDesc}>
                How the company, the products and the thinking are taking shape.
              </p>
            </div>
            <div className={styles.grid}>
              {roadEntries.map((entry) => (
                <article className={styles.card} key={entry.title}>
                  <div className={styles.cardTop}>
                    <span>{entry.type}</span>
                    <span>{entry.meta}</span>
                  </div>
                  <h2>{entry.title}</h2>
                  <p>{entry.summary}</p>
                  <span className={styles.placeholder}>Coming soon</span>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className={styles.category} aria-label="Research Commentary">
          <Container>
            <div className={styles.categoryHeader}>
              <p className={styles.categoryLabel}>Research Commentary</p>
              <p className={styles.categoryDesc}>
                Observations from the Research Map and the signals driving the platform.
              </p>
            </div>
            <div className={styles.grid}>
              {researchEntries.map((entry) => (
                <article className={styles.card} key={entry.title}>
                  <div className={styles.cardTop}>
                    <span>{entry.type}</span>
                    <span>{entry.meta}</span>
                  </div>
                  <h2>{entry.title}</h2>
                  <p>{entry.summary}</p>
                  <span className={styles.placeholder}>Coming soon</span>
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
