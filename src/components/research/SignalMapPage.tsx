"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { Signal, TrendItem, Domain } from "@/lib/signals";
import { ALL_DOMAINS, getSignalById } from "@/lib/signals";
import { DomainFilter } from "./DomainFilter";
import { SignalTooltip } from "./SignalTooltip";
import { SignalPanel } from "./SignalPanel";
import { TopTrendsSidebar } from "./TopTrendsSidebar";
import styles from "./SignalMapPage.module.css";

// MapLibre is browser-only — SSR disabled
const ResearchMap = dynamic(() => import("./ResearchMap"), { ssr: false });

interface Props {
  signals: Signal[];
  trends: TrendItem[];
  updatedAt: string;
}

type TooltipState = {
  signal: Signal;
  x: number;
  y: number;
} | null;

export function SignalMapPage({ signals, trends, updatedAt }: Props) {
  const [activeDomains, setActiveDomains] = useState<Domain[]>([...ALL_DOMAINS]);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [highlightedSignalIds, setHighlightedSignalIds] = useState<
    string[] | null
  >(null);

  const filteredSignals = useMemo(
    () => signals.filter((s) => activeDomains.includes(s.primary_domain)),
    [signals, activeDomains]
  );

  const selectedSignal = selectedSignalId
    ? getSignalById(selectedSignalId)
    : null;

  const handleSignalClick = useCallback((signalId: string) => {
    setSelectedSignalId(signalId);
    setTooltip(null);
  }, []);

  const handleSignalHover = useCallback(
    (data: { signalId: string; x: number; y: number } | null) => {
      if (!data) {
        setTooltip(null);
        return;
      }
      const signal = getSignalById(data.signalId);
      if (signal) {
        setTooltip({ signal, x: data.x, y: data.y });
      }
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setSelectedSignalId(null);
  }, []);

  return (
    <div className={styles.layout}>
      {/* ── Map section ─────────────────────────────────────────────────── */}
      <div className={styles.mapSection}>
        {/* Domain filter overlaid on map */}
        <div className={styles.filterOverlay}>
          <DomainFilter
            activeDomains={activeDomains}
            onChange={setActiveDomains}
          />
        </div>

        {/* Map + tooltip wrapper */}
        <div className={styles.mapWrapper}>
          <ResearchMap
            signals={filteredSignals}
            highlightedSignalIds={highlightedSignalIds}
            onSignalClick={handleSignalClick}
            onSignalHover={handleSignalHover}
          />
          {tooltip && !selectedSignalId && (
            <SignalTooltip
              signal={tooltip.signal}
              x={tooltip.x}
              y={tooltip.y}
            />
          )}
        </div>

        {/* Staleness label */}
        <div className={styles.mapFooter}>
          <span className={styles.updatedLabel}>
            Data current as of{" "}
            {new Date(updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className={styles.signalCountLabel}>
            {filteredSignals.length} signal
            {filteredSignals.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        {selectedSignal ? (
          <SignalPanel signal={selectedSignal} onClose={handleClosePanel} />
        ) : (
          <TopTrendsSidebar
            trends={trends}
            updatedAt={updatedAt}
            signalCount={filteredSignals.length}
            onTrendHover={setHighlightedSignalIds}
          />
        )}
      </aside>
    </div>
  );
}
