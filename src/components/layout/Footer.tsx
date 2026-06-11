import { Container } from "./Container";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <span className={styles.wordmark}>CENTARI</span>
        <a href="mailto:hello@centari.se" className={styles.contact}>
          hello@centari.se
        </a>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Centari
        </p>
      </Container>
    </footer>
  );
}
