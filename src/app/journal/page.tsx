"use client";

import { useMemo, useState } from "react";
import {
  BrainAtlas,
  brainRegions,
  type BrainRegionId,
} from "@/components/journal/BrainAtlas";
import { JournalArticleCard } from "@/components/journal/JournalArticleCard";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { journalEntries, journalEntryTypes } from "@/lib/journal-data";
import styles from "./journal.module.css";

const summarySlots = [
  {
    label: "Daily capture",
    text: "Highest-scored research signals mapped to the region before they expire from the live layer.",
  },
  {
    label: "Weekly movement",
    text: "A short synthesis of what changed, what repeated, and what deserves a return path.",
  },
  {
    label: "Monthly pattern",
    text: "A slower read on how the trend is moving across AI, spatial work, energy, materials, space, and operations.",
  },
];

export default function JournalPage() {
  const [activeRegionId, setActiveRegionId] = useState<BrainRegionId>("prefrontal");
  const activeRegion = brainRegions.find((region) => region.id === activeRegionId) ?? brainRegions[0];
  const regionEntries = useMemo(
    () =>
      journalEntries.filter((entry) =>
        entry.senses.some((sense) => activeRegion.journalSenses.includes(sense)),
      ),
    [activeRegion],
  );
  const supportingEntries = regionEntries.length > 0 ? regionEntries : journalEntries.slice(0, 3);

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.atlasHero}>
          <div className={styles.atlasCopy}>
            <p className={styles.kicker}>Centari Journal</p>
            <h1>Brain as index.</h1>
            <p>
              The journal stores useful learning by how people perceive, remember, decide, and act.
              Choose a brain region, then use it as the control surface for saved notes, research,
              and summaries.
            </p>
            <div className={styles.heroMetrics} aria-label="Journal metrics">
              <span>{journalEntries.length.toString().padStart(2, "0")} entries</span>
              <span>{journalEntryTypes.length.toString().padStart(2, "0")} lanes</span>
              <span>{brainRegions.length.toString().padStart(2, "0")} regions</span>
            </div>
          </div>

          <BrainAtlas selectedId={activeRegionId} onRegionChange={setActiveRegionId} />

          <aside className={styles.indexPanel} aria-label="Selected journal region">
            <p className={styles.panelLabel}>Active region</p>
            <strong>{activeRegion.label}</strong>
            <span>{activeRegion.area}</span>
            <p>{activeRegion.archiveRole}</p>
            <i />
            <span>Mapped content</span>
            <p>{supportingEntries.length} journal entries / {activeRegion.journalSenses.join(" + ")}</p>
          </aside>
        </section>

        <section id="journal-region-record" className={styles.regionRecord} aria-label="Selected brain region journal">
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Selected Region</p>
            <h2>{activeRegion.label}</h2>
            <p>{activeRegion.role} {activeRegion.centariUse}</p>
          </div>

          <div className={styles.regionBrief}>
            <article>
              <span>What it stores</span>
              <p>{activeRegion.archiveRole}</p>
            </article>
            <article>
              <span>Current tags</span>
              <div className={styles.tagList}>
                {activeRegion.evidence.map((tag) => (
                  <b key={tag}>{tag}</b>
                ))}
              </div>
            </article>
            <article>
              <span>Mapped senses</span>
              <div className={styles.tagList}>
                {activeRegion.journalSenses.map((sense) => (
                  <b key={sense}>{sense}</b>
                ))}
              </div>
            </article>
          </div>

          <div className={styles.summaryGrid} aria-label="Future summaries">
            {summarySlots.map((slot) => (
              <article key={slot.label}>
                <span>{slot.label}</span>
                <p>{slot.text}</p>
              </article>
            ))}
          </div>

          <div className={styles.entryHeader}>
            <p className={styles.kicker}>Mapped Entries</p>
            <span>{supportingEntries.length.toString().padStart(2, "0")} records</span>
          </div>
          <div className={styles.entryGrid}>
            {supportingEntries.map((entry) => (
              <JournalArticleCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
