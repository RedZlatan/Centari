import Link from "next/link";
import {
  controlRoomContent,
  controlRoomNav,
  type ControlRoomPage,
} from "@/lib/control-room-data";
import styles from "./ControlRoomShell.module.css";

interface ControlRoomShellProps {
  page: ControlRoomPage;
}

function MonolithMark() {
  return (
    <svg className={styles.monolith} viewBox="0 0 48 96" aria-hidden="true">
      <path d="M24 4 39 22v62l-15 8L9 84V22L24 4Z" />
      <path d="M24 4v88" />
      <path d="M16 77h16" />
      <path d="M19 52h10" className={styles.brassStroke} />
      <path d="M24 47v10" className={styles.brassStroke} />
    </svg>
  );
}

function Wordmark() {
  return (
    <Link href="/" className={styles.wordmark} aria-label="Centari home">
      <span>C</span>
      <span>E</span>
      <span>N</span>
      <span>T</span>
      <span>A</span>
      <span>R</span>
      <span>I</span>
    </Link>
  );
}

export function ControlRoomShell({ page }: ControlRoomShellProps) {
  const content = controlRoomContent[page];

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.identity}>
          <MonolithMark />
          <Wordmark />
        </div>

        <nav className={styles.nav} aria-label="Control Room navigation">
          {controlRoomNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`${styles.navItem} ${item.label === page ? styles.active : ""}`}
            >
              <span>{item.label}</span>
              <span className={styles.navIndex}>
                {String(controlRoomNav.indexOf(item) + 1).padStart(2, "0")}
              </span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span>Mock data only</span>
          <span>No auth / DB / backend</span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>{content.eyebrow}</p>
            <h1>{content.title}</h1>
          </div>
          <div className={styles.statusCluster} aria-label="System status">
            <span>Visual validation</span>
            <strong>Nominal</strong>
          </div>
        </header>

        <section className={styles.heroPanel}>
          <div className={styles.referenceObject}>
            <MonolithMark />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.signal}>{content.signal}</p>
            <p>{content.summary}</p>
          </div>
          <div className={styles.calibrationRail}>
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className={styles.metricsGrid} aria-label={`${page} metrics`}>
          {content.modules.map((module) => (
            <article key={module.label} className={styles.metricCard}>
              <p>{module.label}</p>
              <strong>{module.value}</strong>
              <span>{module.meta}</span>
            </article>
          ))}
        </section>

        <section className={styles.lowerGrid}>
          <article className={styles.tablePanel}>
            <div className={styles.panelHeader}>
              <h2>{page} register</h2>
              <span>{content.rows.length} entries</span>
            </div>
            <div className={styles.table}>
              {content.rows.map((row) => (
                <div key={row.id} className={styles.tableRow}>
                  <span>{row.id}</span>
                  <strong>{row.title}</strong>
                  <span>{row.status}</span>
                  <span>{row.owner}</span>
                  <span>{row.updated}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className={styles.contextPanel}>
            <div className={styles.panelHeader}>
              <h2>Material state</h2>
              <span>Identity 1.5</span>
            </div>
            <div className={styles.swatches}>
              <span className={styles.carbon}>Carbon</span>
              <span className={styles.stone}>Stone</span>
              <span className={styles.granite}>Granite</span>
              <span className={styles.brass}>Brass</span>
            </div>
            <p>
              The shell keeps work visible: measured, quiet and designed for
              decisions that have to survive contact with real environments.
            </p>
          </aside>
        </section>
      </section>
    </main>
  );
}
