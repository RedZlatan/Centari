import { Container } from "@/components/layout/Container";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <Container className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.tagline} aria-hidden="true">
            <span>Before Reality.</span>
          </div>
          <h1 className={styles.headline}>
            Understand. Build.
            <br />
            Learn. Operate.
          </h1>
          <div
            className={styles.supportingLine}
            aria-label="Research. Simulation. Spatial Computing."
          >
            <span>Research. Simulation. Spatial Computing.</span>
          </div>
          <p className={styles.body}>
            Centari builds the systems organisations use to understand what is changing,
            build for it before it arrives, learn how to operate within it, and run it over time.
          </p>
          <div className={styles.ctas}>
            <a href="#platform" className={styles.primaryCta}>
              See the Platform
            </a>
            <a href="/research" className={styles.secondaryCta}>
              Research Map
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
