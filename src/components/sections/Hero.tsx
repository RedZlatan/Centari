import { Container } from "@/components/layout/Container";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <Container className={styles.inner}>
        <div className={styles.content}>
          <h1 className={styles.headline}>Solve the problem.</h1>
          <p className={styles.body}>
            Centari builds systems that help organisations understand, train for
            and shape the future.
          </p>
          <div className={styles.ctas}>
            <a href="#products" className={styles.primaryCta}>
              Explore Solutions
            </a>
            <a href="#" className={styles.secondaryCta}>
              Enter Control Room
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
