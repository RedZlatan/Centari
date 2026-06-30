"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/layout/Container";
import styles from "./Hero.module.css";

// Switch to "B" to review the alternate supporting line.
const SUPPORTING_LINE_VARIANT: "A" | "B" = "A";

const SUPPORTING_LINES = {
  A: {
    lines: ["AI.", "2D.", "3D.", "XR.", "Reality."],
    closing: "The right medium for the task.",
  },
  B: {
    lines: ["Understand.", "Build.", "Validate."],
    closing: null,
  },
} as const;

function useHeroProgress(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = sectionRef.current;

        if (!section) {
          return;
        }

        const rect = section.getBoundingClientRect();
        const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
        const nextProgress = Math.min(Math.max(-rect.top / travel, 0), 1);
        setProgress(nextProgress);
      });
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [sectionRef]);

  return progress;
}

function HeroFacade() {
  return (
    <div className={styles.facade} aria-hidden="true">
      <div className={styles.facadeFrame}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.depthPlanes}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.portalCore}>
        <span />
        <span />
      </div>
      <div className={styles.facadeMetrics}>
        <span>01</span>
        <span>OS</span>
        <span>READY</span>
      </div>
    </div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useHeroProgress(sectionRef);
  const supportingLine = SUPPORTING_LINES[SUPPORTING_LINE_VARIANT];

  return (
    <section
      ref={sectionRef}
      className={styles.hero}
      style={{ "--hero-progress": progress } as CSSProperties}
    >
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
            Centari helps organisations move between text, 2D, 3D, XR and
            physical work. We use the simplest medium that solves the task.
          </p>
          <div className={styles.ctas}>
            <a href="#products" className={styles.primaryCta}>
              Explore Ecosystem
            </a>
            <a href="/control-room" className={styles.secondaryCta}>
              Enter Control Room
            </a>
          </div>
        </div>
        <HeroFacade />
      </Container>
    </section>
  );
}
