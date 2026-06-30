import { framework } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import styles from "./Framework.module.css";

export function Framework() {
  return (
    <section className={styles.section} id="platform">
      <Container>
        <div className={styles.header}>
          <p className={styles.label}>Platform</p>
          <h2 className={styles.heading}>One platform. Four operational stages.</h2>
          <p className={styles.subheading}>
            Centari is built around how organisations actually work — understanding change,
            building for it, learning through it and operating within it.
          </p>
        </div>
        <div className={styles.stages}>
          {framework.map((stage, index) => (
            <div key={stage.id} className={styles.stage}>
              <div className={styles.stageIndex}>
                <span className={styles.indexNum}>{String(index + 1).padStart(2, "0")}</span>
                {stage.emerging && (
                  <span className={styles.emergingBadge}>Emerging</span>
                )}
              </div>
              <div className={styles.stageContent}>
                <h3 className={styles.stageLabel}>{stage.label}</h3>
                <p className={styles.stageQuestion}>{stage.question}</p>
                <p className={styles.stageBody}>{stage.body}</p>
                <ul className={styles.capabilities}>
                  {stage.capabilities.map((cap) => (
                    <li key={cap}>{cap}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
