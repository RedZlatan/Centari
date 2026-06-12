import type { CSSProperties } from "react";
import type { Signal } from "@/lib/signals";
import { DOMAIN_COLORS, DOMAIN_LABELS, SIGNAL_TYPE_LABELS } from "@/lib/signals";
import styles from "./SignalPanel.module.css";

interface Props {
  signal: Signal;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SignalPanel({ signal, onClose }: Props) {
  const color = DOMAIN_COLORS[signal.primary_domain];

  return (
    <div className={styles.panel}>
      <button className={styles.back} onClick={onClose}>
        ← All signals
      </button>

      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.domainDot} style={{ background: color }} />
          <span className={styles.domain} style={{ color }}>
            {DOMAIN_LABELS[signal.primary_domain]}
          </span>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>
            {SIGNAL_TYPE_LABELS[signal.signal_type]}
          </span>
          <span className={styles.score} title="Curator score">
            {signal.curator_score}/10
          </span>
        </div>
      </div>

      <h2 className={styles.title}>{signal.title}</h2>

      <p className={styles.summary}>{signal.summary}</p>

      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Location</span>
          <span className={styles.detailValue}>{signal.location_label}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Published</span>
          <span className={styles.detailValue}>
            {formatDate(signal.published_at)}
          </span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Source</span>
          <span className={styles.detailValue}>{signal.source_name}</span>
        </div>
      </div>

      <a
        href={signal.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sourceLink}
      >
        View source ↗
      </a>

      {signal.tags.length > 0 && (
        <div className={styles.tags}>
          {signal.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
