import { principles } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import styles from "./Principles.module.css";

export function Principles() {
  return (
    <section className={styles.section} id="principles">
      <Container>
        <p className={styles.label}>How we work</p>
        <div className={styles.grid}>
          {principles.map((principle) => (
            <div key={principle.id} className={styles.item}>
              <h3 className={styles.principleLabel}>{principle.label}</h3>
              <p className={styles.principleBody}>{principle.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
