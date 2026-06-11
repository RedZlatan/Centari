"use client";

import { useEffect, useState } from "react";
import { Container } from "./Container";
import styles from "./Header.module.css";

const NAV_ITEMS = [
  { label: "Solutions", href: "#products" },
  { label: "Products", href: "#products" },
  { label: "Research", href: "#" },
  { label: "Journal", href: "#" },
  { label: "Control Room", href: "/control-room", isControlRoom: true },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <Container className={styles.inner}>
        <span className={styles.wordmark}>CENTARI</span>
        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`${styles.navLink} ${item.isControlRoom ? styles.controlRoom : ""}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </Container>
    </header>
  );
}
