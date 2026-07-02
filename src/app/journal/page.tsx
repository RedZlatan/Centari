import { JournalArticleCard } from "@/components/journal/JournalArticleCard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { journalEntries, journalEntryTypes } from "@/lib/journal-data";
import styles from "./journal.module.css";

const journalLanes = [
  {
    label: "Sense Map",
    text: "Notes on how people see, hear, touch, remember, and decide inside operational systems.",
  },
  {
    label: "Memory Bank",
    text: "Stories and references that should be found again when a similar problem appears.",
  },
  {
    label: "Field Lessons",
    text: "What reality changes: weather, stress, hardware limits, time pressure, and human judgement.",
  },
  {
    label: "Signal Archive",
    text: "Daily research signals that are worth keeping after they stop being new.",
  },
];

const atlasNodes = [
  { label: "Sight", detail: "interface, attention, pattern" },
  { label: "Sound", detail: "timing, rhythm, warning" },
  { label: "Touch", detail: "presence, friction, control" },
  { label: "Memory", detail: "return, story, context" },
  { label: "Decision", detail: "stress, confidence, action" },
];

export default function JournalPage() {
  const latestEntry = journalEntries[0];
  const featuredEntries = journalEntries.slice(0, 2);
  const archiveEntries = journalEntries.slice(2);

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.atlasHero}>
          <div className={styles.atlasCopy}>
            <p className={styles.kicker}>Centari Journal</p>
            <h1>Memory layer.</h1>
            <p>
              A calm archive for what Centari learns: research signals, field lessons, spatial
              learning, and the human patterns behind better operational work.
            </p>
            <div className={styles.heroMetrics} aria-label="Journal metrics">
              <span>{journalEntries.length.toString().padStart(2, "0")} entries</span>
              <span>{journalEntryTypes.length.toString().padStart(2, "0")} lanes</span>
              <span>{atlasNodes.length.toString().padStart(2, "0")} senses</span>
            </div>
          </div>

          <div className={styles.bodyAtlas} aria-label="Journal brain atlas">
            <div className={styles.humanFigure} aria-hidden="true">
              <span className={styles.head} />
              <span className={styles.spine} />
              <span className={styles.shoulders} />
              <span className={styles.torso} />
              <span className={styles.brain} />
            </div>
            <div className={styles.neuralRing} aria-hidden="true" />
            {atlasNodes.map((node) => (
              <div key={node.label} className={styles.senseNode}>
                <strong>{node.label}</strong>
                <span>{node.detail}</span>
              </div>
            ))}
          </div>

          <aside className={styles.indexPanel} aria-label="Journal register">
            <p className={styles.panelLabel}>Current lens</p>
            <strong>{latestEntry.title}</strong>
            <span>{latestEntry.id}</span>
            <p>{latestEntry.type}</p>
            <i />
            <span>Built for return</span>
            <p>Not a blog feed. A map of what keeps becoming useful.</p>
          </aside>
        </section>

        <section className={styles.laneBand} aria-label="Journal lanes">
          {journalLanes.map((lane) => (
            <article key={lane.label}>
              <span>{lane.label}</span>
              <p>{lane.text}</p>
            </article>
          ))}
        </section>

        <section className={styles.layout} aria-label="Journal entries">
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Register</p>
            <h2>Entries arranged by return value.</h2>
            <p>
              Own notes, outside references, and product lessons sit in the same system so patterns
              can be found later.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {featuredEntries.map((entry) => (
              <JournalArticleCard key={entry.id} entry={entry} featured />
            ))}
          </div>
          <div className={styles.entryGrid}>
            {archiveEntries.map((entry) => (
              <JournalArticleCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className={styles.memoryMap} aria-label="Memory map">
          <div>
            <p className={styles.kicker}>Memory Bank</p>
            <h2>The archive should learn with the system.</h2>
          </div>
          <p>
            The next step is to connect the daily research snapshots to weekly and monthly summaries.
            The journal then becomes more than storage: it becomes a way to see how AI, energy,
            robotics, XR, materials, space, and operational practice are moving over time.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
