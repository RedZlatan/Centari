import type { JournalEntry } from "@/lib/journal-data";
import styles from "./JournalArticleCard.module.css";

interface JournalArticleCardProps {
  entry: JournalEntry;
  featured?: boolean;
}

export function JournalArticleCard({ entry, featured = false }: JournalArticleCardProps) {
  return (
    <article className={`${styles.card} ${featured ? styles.featured : ""}`}>
      <a href={`/journal/${entry.slug}`} className={styles.link}>
        <div className={styles.meta}>
          <span>{entry.id}</span>
          <span className={styles.badge}>{entry.type}</span>
          <span>{entry.readTime}</span>
        </div>
        <p className={styles.deck}>{entry.deck}</p>
        <h2>{entry.title}</h2>
        <p className={styles.summary}>{entry.summary}</p>
        <div className={styles.senses} aria-label="Mapped senses">
          {entry.senses.map((sense) => (
            <span key={sense}>{sense}</span>
          ))}
        </div>
        <div className={styles.footer}>
          <span>{entry.date}</span>
          <span>{entry.location}</span>
          <span>{entry.calibration}</span>
        </div>
      </a>
    </article>
  );
}
