import type { CSSProperties } from "react";
import type { TrendItem } from "@/lib/signals";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/lib/signals";
import styles from "./TopTrendsSidebar.module.css";

interface Props {
  trends: TrendItem[];
  updatedAt: string;
  signalCount: number;
  onTrendHover: (signalIds: string[] | null) => void;
}

export function TopTrendsSidebar({
  trends,
  updatedAt,
  signalCount,
  onTrendHover,
}: Props) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Trending</span>
          <span className={styles.signalCount}>{signalCount} signals</span>
        </div>
        <span className={styles.updated}>Updated {updatedAt}</span>
      </div>

      <ol className={styles.list}>
        {trends.map((trend) => {
          const color = DOMAIN_COLORS[trend.primary_domain];
          return (
            <li
              key={trend.rank}
              className={styles.item}
              onMouseEnter={() => onTrendHover(trend.signal_ids)}
              onMouseLeave={() => onTrendHover(null)}
            >
              <div className={styles.itemRank}>
                {String(trend.rank).padStart(2, "0")}
              </div>
              <div className={styles.itemBody}>
                <div className={styles.itemMeta}>
                  <span
                    className={styles.domainDot}
                    style={{ background: color } as CSSProperties}
                  />
                  <span
                    className={styles.domainLabel}
                    style={{ color } as CSSProperties}
                  >
                    {DOMAIN_LABELS[trend.primary_domain]}
                  </span>
                </div>
                <p className={styles.itemHeadline}>{trend.headline}</p>
                <p className={styles.itemExplanation}>{trend.explanation}</p>
                <span className={styles.itemSignals}>
                  {trend.signal_ids.length}{" "}
                  {trend.signal_ids.length === 1 ? "signal" : "signals"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
