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
  const threshold = useRef<Mesh>(null);

  useFrame(({ camera }, delta) => {
    const approach = MathUtils.smoothstep(progress, 0.05, 0.78);
    const enter = MathUtils.smoothstep(progress, 0.7, 1);
    const opening = MathUtils.smoothstep(progress, 0.62, 0.9);
    const thresholdCrossing = MathUtils.smoothstep(progress, 0.76, 0.92);
    const ease = 1 - Math.exp(-delta * 2.15);

    camera.position.x = MathUtils.lerp(camera.position.x, MathUtils.lerp(3.2, 0, enter), ease);
    camera.position.y = MathUtils.lerp(camera.position.y, MathUtils.lerp(2.35, 0.42, enter), ease);
    camera.position.z = MathUtils.lerp(camera.position.z, MathUtils.lerp(22, 2.85, approach), ease);
    camera.lookAt(0, MathUtils.lerp(1.7, 0.2, enter), MathUtils.lerp(0, -2.6, thresholdCrossing));

    if (group.current) {
      group.current.rotation.y = MathUtils.lerp(-0.14, 0, approach);
      group.current.position.z = MathUtils.lerp(0, 1.1, enter);
    }

    if (leftDoor.current && rightDoor.current) {
      leftDoor.current.position.x = MathUtils.lerp(-0.76, -1.34, opening);
      rightDoor.current.position.x = MathUtils.lerp(0.76, 1.34, opening);
    }

    if (threshold.current) {
      threshold.current.scale.z = MathUtils.lerp(0.18, 1.55, thresholdCrossing);
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, -2.72, -0.12]}>
        <boxGeometry args={[5.4, 0.52, 2.4]} />
        <meshStandardMaterial color="#151916" roughness={0.96} metalness={0.02} />
      </mesh>

      <mesh position={[0, 1.08, -0.42]}>
        <boxGeometry args={[3.05, 8.25, 0.18]} />
        <meshStandardMaterial color="#111411" roughness={0.98} metalness={0.01} />
      </mesh>

      <mesh ref={leftDoor} position={[-0.76, 1.08, 0]}>
        <boxGeometry args={[1.46, 7.6, 0.68]} />
        <meshStandardMaterial color="#1a1f1b" roughness={0.98} metalness={0.015} />
      </mesh>

      <mesh ref={rightDoor} position={[0.76, 1.08, 0]}>
        <boxGeometry args={[1.46, 7.6, 0.68]} />
        <meshStandardMaterial color="#222821" roughness={0.98} metalness={0.012} />
      </mesh>

      <mesh position={[-0.38, 1.08, 0.39]}>
        <boxGeometry args={[0.62, 7.18, 0.025]} />
        <meshStandardMaterial color="#2d342e" roughness={0.99} metalness={0} />
      </mesh>

      <mesh position={[0.44, 1.08, 0.4]}>
        <boxGeometry args={[0.52, 7.08, 0.025]} />
        <meshStandardMaterial color="#252c26" roughness={0.99} metalness={0} />
      </mesh>

      <mesh position={[0, 5.92, 0.02]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[2.08, 2.08, 0.7]} />
        <meshStandardMaterial color="#1b211c" roughness={0.98} metalness={0.012} />
      </mesh>

      <mesh position={[-1.52, 1.18, 0.43]}>
        <boxGeometry args={[0.035, 7.3, 0.045]} />
        <meshStandardMaterial color="#495149" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh position={[1.52, 1.18, 0.43]}>
        <boxGeometry args={[0.035, 7.3, 0.045]} />
        <meshStandardMaterial color="#3b443d" roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh position={[0, 4.86, 0.44]}>
        <boxGeometry args={[2.42, 0.032, 0.045]} />
        <meshStandardMaterial color="#3d453d" roughness={0.94} metalness={0.015} />
      </mesh>

      <mesh position={[-0.02, 1.02, 0.37]}>
        <boxGeometry args={[0.035, 5.6, 0.045]} />
        <meshStandardMaterial color="#111511" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, -0.25, 0.42]}>
        <boxGeometry args={[0.74, 0.045, 0.055]} />
        <meshStandardMaterial color="#6f6047" roughness={0.78} metalness={0.12} />
      </mesh>

      <mesh position={[-0.54, 1.6, 0.39]}>
        <boxGeometry args={[0.022, 4.7, 0.035]} />
        <meshStandardMaterial color="#222724" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0.58, 1.75, 0.39]}>
        <boxGeometry args={[0.018, 4.35, 0.035]} />
        <meshStandardMaterial color="#090a0a" roughness={1} metalness={0} />
      </mesh>

      <mesh ref={threshold} position={[0, -2.43, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 4.2]} />
        <meshStandardMaterial color="#111411" roughness={0.96} metalness={0.01} />
      </mesh>

      <mesh position={[0, -2.48, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial color="#171b18" roughness={0.98} metalness={0} />
      </mesh>
    </group>
  );
}

function FieldScene({ progress }: { progress: number }) {
  return (
    <Canvas camera={{ position: [3.2, 2.35, 22], fov: 35 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#181b19"]} />
      <fog attach="fog" args={["#181b19", 10, 38]} />
      <ambientLight intensity={0.26} />
      <hemisphereLight args={["#d6d0c6", "#111411", 0.46]} />
      <directionalLight position={[-5, 8, 8]} intensity={0.9} color="#d8d2c7" />
      <directionalLight position={[5, 3, -4]} intensity={0.34} color="#8a806f" />
      <spotLight position={[0, 6.4, 5.8]} angle={0.26} penumbra={0.9} intensity={0.66} color="#c8bfae" />
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
