"use client";

import { useEffect, useState } from "react";
import { Container } from "./Container";
import styles from "./Header.module.css";

const NAV_ITEMS = [
  { label: "Ecosystem", href: "/#products" },
  { label: "Method", href: "/#principles" },
  { label: "Research", href: "/research" },
  { label: "Journal", href: "/journal" },
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
        <div className={styles.brandCluster}>
          <a href="/" className={styles.brand} aria-label="Centari home">
            <svg className={styles.brandMark} viewBox="0 0 48 96" aria-hidden="true">
              <path d="M24 4 39 22v62l-15 8L9 84V22L24 4Z" />
              <path d="M24 4v88" />
              <path d="M16 77h16" />
              <path className={styles.brassStroke} d="M19 52h10" />
              <path className={styles.brassStroke} d="M24 47v10" />
            </svg>
            <span className={styles.wordmark}>CENTARI</span>
          </a>
          <a href="/vision" className={styles.visionEntry}>
            Vision room
          </a>
        </div>
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
