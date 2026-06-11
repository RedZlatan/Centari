"use client";

import { FormEvent, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
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

function CalibrationSplitMark() {
  return (
    <svg className={styles.monolithMark} viewBox="0 0 96 160" aria-hidden="true">
      <path className={styles.leftPlane} d="M48 8 20 42v94l28 16V8Z" />
      <path className={styles.rightPlane} d="M48 8 76 42v94l-28 16V8Z" />
      <path className={styles.splitLine} d="M48 8v144" />
      <path className={styles.referenceLine} d="M34 96h28" />
      <path className={styles.referenceLine} d="M48 82v28" />
    </svg>
  );
}

export function MonolithPrototype() {
  const [submitted, setSubmitted] = useState(false);
  const reference = useMemo(() => "CT-PB-0317", []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className={styles.section} id="monolith">
      <Container>
        <div className={styles.grid}>
          <div className={styles.narrative}>
            <p className={styles.kicker}>Monolith MVP / Problem intake</p>
            <h2>Bring your problem.</h2>
            <p className={styles.lede}>
              The Monolith is a reference point for complex work: a place to
              state the problem clearly before tools, simulations, systems, or
              infrastructure are proposed.
            </p>

            <div className={styles.identityBlock} aria-label="Centari identity preview">
              <CalibrationSplitMark />
              <div>
                <p className={styles.wordmark}>CENTARI</p>
                <p>Calibration Split / C2 Measured Terminals</p>
              </div>
            </div>

            <div className={styles.principles}>
              <span>Observe</span>
              <span>Calibrate</span>
              <span>Define</span>
              <span>Operate</span>
            </div>
          </div>

          <div className={styles.panel}>
            {submitted ? (
              <div className={styles.submittedState} role="status">
                <p className={styles.kicker}>Mock submit state</p>
                <h3>Problem registered.</h3>
                <p>
                  Reference <strong>{reference}</strong> has been created for
                  visual validation. No data was sent or stored.
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
                    rows={5}
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
      </Container>
    </section>
  );
}
