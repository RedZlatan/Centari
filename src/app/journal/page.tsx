import { JournalArticleCard } from "@/components/journal/JournalArticleCard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { journalEntries, journalEntryTypes } from "@/lib/journal-data";
import styles from "./journal.module.css";

export default function JournalPage() {
  const latestEntry = journalEntries[0];

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.atlasHero}>
          <div className={styles.atlasCopy}>
            <p className={styles.kicker}>Centari Journal</p>
            <h1>Journal.</h1>
            <p>
              A quieter memory layer for the work: research notes, field lessons, and references
              mapped through senses, space, and return.
            </p>
          </div>

          <div className={styles.bodyAtlas} aria-label="Journal brain atlas">
            <div className={styles.humanFigure} aria-hidden="true">
              <span className={styles.head} />
              <span className={styles.spine} />
              <span className={styles.shoulders} />
              <span className={styles.torso} />
              <span className={styles.brain} />
            </div>
            <div className={styles.senseNode} data-node="Sight" />
            <div className={styles.senseNode} data-node="Sound" />
            <div className={styles.senseNode} data-node="Touch" />
            <div className={styles.senseNode} data-node="Memory" />
            <div className={styles.senseNode} data-node="Decision" />
          </div>

          <aside className={styles.indexPanel} aria-label="Journal register">
            <p className={styles.panelLabel}>Latest register</p>
            <strong>{latestEntry.title}</strong>
            <span>{latestEntry.id}</span>
            <p>{latestEntry.type}</p>
            <i />
            <span>{journalEntries.length.toString().padStart(2, "0")}</span>
            <p>Stored entries</p>
          </aside>
        </section>

        <section className={styles.laneBand} aria-label="Journal lanes">
          {journalEntryTypes.map((type) => (
            <span key={type}>
              {type}
            </span>
          ))}
        </section>

        <section className={styles.layout} aria-label="Journal entries">
          <div className={styles.entryGrid}>
            {journalEntries.map((entry) => (
              <JournalArticleCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className={styles.memoryMap} aria-label="Memory map">
          <div>
            <p className={styles.kicker}>Memory Bank</p>
            <h2>Built to become a reference layer.</h2>
          </div>
          <p>
            This is the early shell. Later it can hold our own articles, saved references, field
            stories, and a real spatial index around the brain map. For launch it should simply
            feel calm, deliberate, and alive enough to return to.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
