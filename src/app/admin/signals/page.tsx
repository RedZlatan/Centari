"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logoutAction } from "../login/actions";
import styles from "../curator.module.css";

type Category =
  | "all"
  | "ai"
  | "xr"
  | "robotics"
  | "quantum"
  | "space"
  | "energy"
  | "materials"
  | "other";

interface Signal {
  id: string;
  title: string;
  summary: string;
  category: string;
  curator_score: number | null;
  signal_strength: number | null;
  published_at: string | null;
  source_url: string | null;
  source_name: string | null;
  status: string;
  ingested_at: string | null;
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  ai: "AI",
  xr: "XR",
  robotics: "Robotics",
  quantum: "Quantum",
  space: "Space",
  energy: "Energy",
  materials: "Materials",
  other: "Other",
};

const ALL_CATEGORIES: Category[] = [
  "all", "ai", "xr", "robotics", "quantum", "space", "energy", "materials", "other",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function SignalRow({
  signal,
  onApprove,
  onReject,
}: {
  signal: Signal;
  onApprove: (id: string) => Promise<void>;
  onReject:  (id: string) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded]     = useState(false);

  const score = signal.curator_score ?? 0;

  async function handleApprove() {
    setSubmitting(true);
    await onApprove(signal.id);
    setSubmitting(false);
  }

  async function handleReject() {
    setSubmitting(true);
    await onReject(signal.id);
    setSubmitting(false);
  }

  return (
    <article className={styles.signalRow} data-submitting={submitting}>
      <div className={styles.scoreCol}>
        <span className={styles.scoreBig}>{score}</span>
        <span className={styles.scoreLabel}>score</span>
        <div className={styles.scoreBar}>
          <div className={styles.scoreBarFill} style={{ transform: `scaleX(${score / 10})` }} />
        </div>
      </div>

      <div className={styles.bodyCol}>
        <div className={styles.signalMeta}>
          <span className={styles.categoryBadge} data-cat={signal.category}>
            {CATEGORY_LABELS[signal.category as Category] ?? signal.category}
          </span>
          <span className={styles.signalDate}>{formatDate(signal.published_at)}</span>
        </div>
        <h2 className={styles.signalTitle}>{signal.title}</h2>
        {signal.source_name || signal.source_url ? (
          <p className={styles.signalSource}>
            {signal.source_url ? (
              <a
                className={styles.sourceLink}
                href={signal.source_url}
                target="_blank"
                rel="noreferrer"
              >
                {signal.source_name || signal.source_url} ↗
              </a>
            ) : (
              signal.source_name
            )}
            {signal.source_name && signal.source_url ? null : null}
          </p>
        ) : null}
        {signal.summary ? (
          <>
            <p className={`${styles.signalSummary} ${expanded ? styles.signalSummaryExpanded : ""}`}>
              {signal.summary}
            </p>
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Collapse" : "Read more"}
            </button>
          </>
        ) : null}
      </div>

      <div className={styles.actionCol}>
        <button type="button" className={styles.approveBtn} onClick={handleApprove} disabled={submitting}>
          Approve
        </button>
        <button type="button" className={styles.rejectBtn} onClick={handleReject} disabled={submitting}>
          Reject
        </button>
      </div>
    </article>
  );
}

export default function CuratorConsolePage() {
  const [signals,        setSignals]        = useState<Signal[]>([]);
  const [loadStatus,     setLoadStatus]     = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage,   setErrorMessage]   = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const fetchSignals = useCallback(async () => {
    setLoadStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/signals?status=pending&limit=200");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const payload = await res.json() as { data: Signal[]; total: number };
      setSignals(payload.data ?? []);
      setLoadStatus("ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load signals.");
      setLoadStatus("error");
    }
  }, []);

  useEffect(() => { void fetchSignals(); }, [fetchSignals]);

  const handleApprove = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/signals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      setSignals((prev) => prev.filter((s) => s.id !== id));
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/signals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      setSignals((prev) => prev.filter((s) => s.id !== id));
    }
  }, []);

  const filtered = useMemo(
    () => activeCategory === "all" ? signals : signals.filter((s) => s.category === activeCategory),
    [signals, activeCategory],
  );

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = { all: signals.length };
    for (const s of signals) {
      const cat = s.category as Category;
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [signals]);

  return (
    <div className={styles.shell}>
      <header className={styles.consoleHeader}>
        <div className={styles.consoleTitle}>
          <p className={styles.kicker}>Centari Internal</p>
          <h1>Curator Console</h1>
        </div>
        <div className={styles.consoleMeta}>
          {loadStatus === "ready" && (
            <span className={styles.pendingCount}>{signals.length} pending</span>
          )}
          <form action={logoutAction}>
            <button type="submit" className={styles.logoutBtn}>Log out</button>
          </form>
        </div>
      </header>

      {errorMessage && (
        <p className={styles.errorBanner}>Error: {errorMessage}</p>
      )}

      <nav className={styles.filters} aria-label="Filter by category">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={activeCategory === cat ? styles.filterActive : ""}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
            {categoryCounts[cat] !== undefined && (
              <span className={styles.filterBadge}>{categoryCounts[cat]}</span>
            )}
          </button>
        ))}
      </nav>

      {loadStatus === "loading" && (
        <div className={styles.skeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow} />
          ))}
        </div>
      )}

      {loadStatus === "ready" && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <h2>Queue cleared</h2>
          <p>
            {signals.length === 0
              ? "No pending signals in database"
              : `No pending signals in '${CATEGORY_LABELS[activeCategory]}'`}
          </p>
        </div>
      )}

      {loadStatus === "ready" && filtered.length > 0 && (
        <div className={styles.signalList} role="list">
          {filtered.map((signal) => (
            <SignalRow
              key={signal.id}
              signal={signal}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
