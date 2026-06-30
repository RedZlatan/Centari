import type { CSSProperties } from "react";
import type { Signal } from "@/lib/signals";
import { DOMAIN_COLORS, DOMAIN_LABELS, SIGNAL_TYPE_LABELS } from "@/lib/signals";
import styles from "./SignalTooltip.module.css";

interface Props {
  signal: Signal;
  x: number;
  y: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function SignalTooltip({ signal, x, y }: Props) {
  const color = DOMAIN_COLORS[signal.primary_domain];
  const clampedX = Math.min(x, window.innerWidth - 310);
  const clampedY = y + 16;

  return (
    <div
      className={styles.tooltip}
      style={{ "--x": `${clampedX}px`, "--y": `${clampedY}px` } as CSSProperties}
    >
      <div className={styles.meta}>
        <span className={styles.domainDot} style={{ background: color }} />
        <span className={styles.domain} style={{ color }}>
          {DOMAIN_LABELS[signal.primary_domain]}
        </span>
        <span className={styles.divider}>·</span>
        <span className={styles.type}>
          {SIGNAL_TYPE_LABELS[signal.signal_type]}
        </span>
      </div>
      <p className={styles.title}>{signal.title}</p>
      <div className={styles.footer}>
        <span>{signal.location_label}</span>
        <span className={styles.divider}>·</span>
        <span>{formatDate(signal.published_at)}</span>
      </div>
    </div>
  );
}
