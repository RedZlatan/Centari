import { principles } from "@/lib/content";
import { Container } from "@/components/layout/Container";
import styles from "./Principles.module.css";

export function Principles() {
  return (
    <section className={styles.section} id="principles">
      <Container>
        <p className={styles.label}>How we work</p>
        <div className={styles.intro}>
          <h2>Start with the task.</h2>
          <p>
            The medium is chosen after the problem is understood. Sometimes that
            means a document, sometimes a 3D model, sometimes XR, and sometimes
            a change in the physical workflow.
          </p>
        </div>
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
