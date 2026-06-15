import { solutions } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import styles from "./Solutions.module.css";

export function Solutions() {
  return (
    <section className={styles.section} id="solutions">
      <Container>
        <div className={styles.header}>
          <p className={styles.label}>Solutions</p>
          <h2>What organisations achieve with Centari.</h2>
          <p>
            Every solution maps to a stage of the operational cycle. Understand what is shifting.
            Build before you commit. Learn through doing. Run at scale.
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
