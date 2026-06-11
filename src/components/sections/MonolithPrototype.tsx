"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { MathUtils } from "three";
import styles from "./MonolithPrototype.module.css";

const categories = [
  "Training & Readiness",
  "Operational Understanding",
  "Edge Intelligence",
  "Digital Operations",
  "Innovation & Simulation",
];

const valueRanges = [
  "Under €50k",
  "€50k–€250k",
  "€250k–€1m",
  "€1m+",
  "Unknown",
];

function useSectionProgress(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const travel = section.offsetHeight - window.innerHeight;
      const current = MathUtils.clamp(-rect.top / Math.max(travel, 1), 0, 1);
      setProgress(current);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [sectionRef]);

  return progress;
}

function CalibrationSplitMonolith({ progress }: { progress: number }) {
  const group = useRef<Group>(null);
  const leftDoor = useRef<Mesh>(null);
  const rightDoor = useRef<Mesh>(null);
  const signal = useRef<Mesh>(null);

  useFrame(({ camera }) => {
    const approach = MathUtils.smoothstep(progress, 0.08, 0.72);
    const enter = MathUtils.smoothstep(progress, 0.68, 1);
    const opening = MathUtils.smoothstep(progress, 0.58, 0.84);

    camera.position.x = MathUtils.lerp(1.8, 0, enter);
    camera.position.y = MathUtils.lerp(1.45, 0.12, enter);
    camera.position.z = MathUtils.lerp(14, 2.15, approach);
    camera.lookAt(0, MathUtils.lerp(0.85, 0.02, enter), MathUtils.lerp(0, -1.2, enter));

    if (group.current) {
      group.current.rotation.y = MathUtils.lerp(-0.18, 0, approach);
      group.current.position.z = MathUtils.lerp(0, 0.7, enter);
    }

    if (leftDoor.current && rightDoor.current) {
      leftDoor.current.position.x = MathUtils.lerp(-0.43, -0.82, opening);
      rightDoor.current.position.x = MathUtils.lerp(0.43, 0.82, opening);
    }

    if (signal.current) {
      signal.current.scale.y = MathUtils.lerp(0.4, 1.45, MathUtils.smoothstep(progress, 0.22, 0.78));
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, -1.42, -0.05]}>
        <boxGeometry args={[2.6, 0.34, 1.1]} />
        <meshStandardMaterial color="#2c3430" roughness={0.86} metalness={0.08} />
      </mesh>

      <mesh ref={leftDoor} position={[-0.43, 0.42, 0]}>
        <boxGeometry args={[0.82, 4.5, 0.34]} />
        <meshStandardMaterial color="#d8d2c8" roughness={0.72} metalness={0.1} />
      </mesh>

      <mesh ref={rightDoor} position={[0.43, 0.42, 0]}>
        <boxGeometry args={[0.82, 4.5, 0.34]} />
        <meshStandardMaterial color="#eee9df" roughness={0.68} metalness={0.08} />
      </mesh>

      <mesh position={[0, 2.82, 0.01]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.18, 1.18, 0.36]} />
        <meshStandardMaterial color="#e9e5df" roughness={0.7} metalness={0.08} />
      </mesh>

      <mesh ref={signal} position={[0, 0.4, 0.22]}>
        <boxGeometry args={[0.035, 2.8, 0.045]} />
        <meshStandardMaterial color="#a88a5a" emissive="#3a2810" roughness={0.4} metalness={0.45} />
      </mesh>

      <mesh position={[0, -0.15, 0.25]}>
        <boxGeometry args={[0.52, 0.035, 0.05]} />
        <meshStandardMaterial color="#a88a5a" emissive="#2c1d0b" roughness={0.44} metalness={0.42} />
      </mesh>

      <mesh position={[0, 0.4, -0.22]}>
        <boxGeometry args={[1.7, 4.75, 0.08]} />
        <meshStandardMaterial color="#17191a" roughness={0.92} metalness={0.04} />
      </mesh>

      <mesh position={[0, -1.18, 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#17191a" roughness={0.95} metalness={0.02} />
      </mesh>
    </group>
  );
}

function FieldScene({ progress }: { progress: number }) {
  return (
    <Canvas camera={{ position: [1.8, 1.45, 14], fov: 42 }} dpr={[1, 1.6]}>
      <color attach="background" args={["#17191a"]} />
      <fog attach="fog" args={["#17191a", 7, 19]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 7, 5]} intensity={1.15} color="#e9e5df" />
      <pointLight position={[0, 1.2, 2.4]} intensity={2.2} color="#a88a5a" />
      <CalibrationSplitMonolith progress={progress} />
    </Canvas>
  );
}

export function MonolithPrototype() {
  const sectionRef = useRef<HTMLElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const progress = useSectionProgress(sectionRef);
  const reference = useMemo(() => "CT-PB-0317", []);
  const inside = progress > 0.72;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section ref={sectionRef} className={styles.section} id="monolith">
      <div className={styles.stickyStage}>
        <div className={styles.canvasLayer} aria-hidden="true">
          <FieldScene progress={progress} />
        </div>

        <div className={styles.vignette} />

        <div className={`${styles.story} ${inside ? styles.storyInside : ""}`}>
          <p className={styles.kicker}>Monolith / Scroll prototype</p>
          <h2>{inside ? "Inside the reference point." : "Bring your problem."}</h2>
          <p>
            {inside
              ? "State the problem from inside the system. The interface is a mock intake surface for validating flow and feeling."
              : "Start outside the Monolith. Move toward it. Enter only when the problem is clear enough to be named."}
          </p>
          <div className={styles.progressRail} aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>

        <div className={`${styles.problemInterface} ${inside ? styles.interfaceVisible : ""}`}>
          {submitted ? (
            <div className={styles.submittedState} role="status">
              <p className={styles.kicker}>Mock submit state</p>
              <h3>Problem registered.</h3>
              <p>
                Reference <strong>{reference}</strong> has been created for visual validation.
                No data was sent or stored.
              </p>
              <button type="button" onClick={() => setSubmitted(false)}>
                Submit another problem
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formHeader}>
                <p className={styles.kicker}>Bring Your Problem</p>
                <h3>Problem submission</h3>
              </div>

              <label className={styles.field}>
                <span>Problem title</span>
                <input name="title" type="text" required placeholder="What needs to be understood?" />
              </label>

              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  name="description"
                  required
                  rows={4}
                  placeholder="Describe the environment, stakes, constraints, and current bottleneck."
                />
              </label>

              <div className={styles.twoColumn}>
                <label className={styles.field}>
                  <span>Category</span>
                  <select name="category" defaultValue={categories[0]}>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Estimated value</span>
                  <select name="value" defaultValue={valueRanges[2]}>
                    {valueRanges.map((range) => (
                      <option key={range}>{range}</option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className={styles.visibility}>
                <legend>Visibility</legend>
                <label>
                  <input type="radio" name="visibility" value="private" defaultChecked />
                  <span>Private</span>
                </label>
                <label>
                  <input type="radio" name="visibility" value="public" />
                  <span>Public</span>
                </label>
              </fieldset>

              <div className={styles.twoColumn}>
                <label className={styles.field}>
                  <span>Name optional</span>
                  <input name="name" type="text" placeholder="Name" />
                </label>

                <label className={styles.field}>
                  <span>Email optional</span>
                  <input name="email" type="email" placeholder="Email" />
                </label>
              </div>

              <button className={styles.submit} type="submit">
                Submit problem
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
