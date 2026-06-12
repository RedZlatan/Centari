import { Container } from "@/components/layout/Container";
import styles from "./Hero.module.css";

// Switch to "B" to review the alternate supporting line.
const SUPPORTING_LINE_VARIANT: "A" | "B" = "A";

const SUPPORTING_LINES = {
  A: {
    lines: ["AI.", "Simulation.", "Infrastructure."],
    closing: "Tools, not goals.",
  },
  B: {
    lines: ["Understand.", "Train.", "Operate."],
    closing: null,
  },
} as const;

export function Hero() {
  const supportingLine = SUPPORTING_LINES[SUPPORTING_LINE_VARIANT];

  return (
    <section className={styles.hero}>
      <Container className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.headline}>Solve the problem.</h1>
          <div
            className={styles.supportingLine}
            aria-label={[
              ...supportingLine.lines,
              supportingLine.closing,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span>{supportingLine.lines.join(" ")}</span>
            {supportingLine.closing ? <span>{supportingLine.closing}</span> : null}
          </div>
          <p className={styles.body}>
            Centari builds systems that help organisations understand, train for
            and shape the future.
          </p>
          <div className={styles.ctas}>
            <a href="#products" className={styles.primaryCta}>
              Explore Solutions
            </a>
            <a href="/control-room" className={styles.secondaryCta}>
              Enter Control Room
            </a>
          </div>
        </div>
        <div className={styles.calibrationObject} aria-hidden="true">
          <span className={styles.monolithFace} />
          <span className={styles.monolithEdge} />
          <span className={styles.calibrationLine} />
          <span className={styles.referenceLine} />
          <span className={styles.basePlane} />
          <span className={styles.measurementRail} />
        </div>
      </Container>
    </section>
  );
}
