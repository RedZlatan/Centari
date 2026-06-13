import { solutions } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import styles from "./Solutions.module.css";

export function Solutions() {
  return (
    <section className={styles.section} id="solutions">
      <Container>
        <div className={styles.header}>
          <p className={styles.label}>Solutions</p>
          <h2>Spatial systems for operational work.</h2>
          <p>
            Centari helps organizations shape physical, spatial and AI-assisted systems before
            they become expensive to build incorrectly.
          </p>
        </div>
        <div className={styles.grid}>
          {solutions.map((solution, index) => (
            <article key={solution.id} className={styles.card}>
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className={styles.signal}>{solution.signal}</p>
                <h3>{solution.name}</h3>
                <p>{solution.body}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
