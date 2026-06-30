"use client";

import type { CSSProperties } from "react";
import { ALL_DOMAINS, DOMAIN_COLORS, DOMAIN_LABELS } from "@/lib/signals";
import type { Domain } from "@/lib/signals";
import styles from "./DomainFilter.module.css";

interface Props {
  activeDomains: Domain[];
  onChange: (domains: Domain[]) => void;
}

export function DomainFilter({ activeDomains, onChange }: Props) {
  function toggle(domain: Domain) {
    if (activeDomains.includes(domain)) {
      if (activeDomains.length === 1) return; // never deselect all
      onChange(activeDomains.filter((d) => d !== domain));
    } else {
      onChange([...activeDomains, domain]);
    }
  }

  function selectAll() {
    onChange([...ALL_DOMAINS]);
  }

  const allActive = activeDomains.length === ALL_DOMAINS.length;

  return (
    <div className={styles.filter}>
      <div className={styles.chips}>
        {ALL_DOMAINS.map((domain) => {
          const active = activeDomains.includes(domain);
          const color = DOMAIN_COLORS[domain];
          return (
            <button
              key={domain}
              className={`${styles.chip} ${active ? styles.active : ""}`}
              style={{ "--chip-color": color } as CSSProperties}
              onClick={() => toggle(domain)}
              aria-pressed={active}
            >
              <span className={styles.dot} style={{ background: color }} />
              {DOMAIN_LABELS[domain]}
            </button>
          );
        })}
        {!allActive && (
          <button className={styles.resetChip} onClick={selectAll}>
            All
          </button>
        )}
      </div>
    </div>
  );
}
