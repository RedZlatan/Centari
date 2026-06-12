import { JournalArticleCard } from "@/components/journal/JournalArticleCard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { journalEntries } from "@/lib/journal-data";
import styles from "./journal.module.css";

const entryTypes = ["Research Notes", "Field Notes", "Product Logs", "Signal Briefs", "Essays"];

export default function JournalPage() {
  const [featuredEntry, ...entries] = journalEntries;
  const latestEntry = journalEntries[0];

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Centari Journal / Before Reality</p>
            <h1>Notes before systems harden.</h1>
            <p>
              A measured editorial surface for research commentary, field observations, product
              decisions, signal briefs, and the harder edges of building useful systems.
            </p>
          </div>
          <div className={styles.indexPanel} aria-label="Journal index">
            <p className={styles.panelLabel}>Current calibration</p>
            <strong>{latestEntry.type}</strong>
            <span>{latestEntry.id}</span>
            <p>{latestEntry.calibration}</p>
            <i />
            <span>{entryTypes.length}</span>
            <p>Editorial lanes</p>
          </div>
        </section>

        <section className={styles.calibrationBand} aria-label="Journal content types">
          {entryTypes.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </section>

        <section className={styles.layout} aria-label="Journal entries">
          <div className={styles.featuredColumn}>
            <JournalArticleCard entry={featuredEntry} featured />
          </div>
          <div className={styles.entryGrid}>
            {entries.map((entry) => (
              <JournalArticleCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className={styles.systemNote} aria-label="Journal publishing path">
          <p className={styles.kicker}>Publishing path</p>
          <p>
            Static seed entries now. The entry model is intentionally narrow so markdown or MDX
            frontmatter can replace this source later without changing the public journal surface.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
