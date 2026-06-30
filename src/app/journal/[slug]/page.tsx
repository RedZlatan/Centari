import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getJournalEntry, journalEntries } from "@/lib/journal-data";
import styles from "./article.module.css";

interface JournalArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return journalEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: JournalArticlePageProps) {
  const { slug } = await params;
  const entry = getJournalEntry(slug);

  if (!entry) {
    return {};
  }

  return {
    title: `${entry.title} | Centari Journal`,
    description: entry.summary,
  };
}

export default async function JournalArticlePage({ params }: JournalArticlePageProps) {
  const { slug } = await params;
  const entry = getJournalEntry(slug);

  if (!entry) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <article className={styles.article}>
          <a href="/journal" className={styles.backLink}>
            Journal index
          </a>
          <header className={styles.header}>
            <div className={styles.meta}>
              <span>{entry.id}</span>
              <span>{entry.type}</span>
              <span>{entry.readTime}</span>
            </div>
            <p className={styles.deck}>{entry.deck}</p>
            <h1>{entry.title}</h1>
            <p className={styles.summary}>{entry.summary}</p>
          </header>

          <aside className={styles.register} aria-label="Article register">
            <div>
              <span>Date</span>
              <strong>{entry.date}</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>{entry.location}</strong>
            </div>
            <div>
              <span>Calibration</span>
              <strong>{entry.calibration}</strong>
            </div>
          </aside>

          <div className={styles.body}>
            {entry.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <section className={styles.senseMap} aria-label="Mapped senses and references">
            <div>
              <h2>Mapped senses</h2>
              <div className={styles.chips}>
                {entry.senses.map((sense) => (
                  <span key={sense}>{sense}</span>
                ))}
              </div>
            </div>
            <div>
              <h2>References</h2>
              <div className={styles.chips}>
                {entry.references.map((reference) => (
                  <span key={reference}>{reference}</span>
                ))}
              </div>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
