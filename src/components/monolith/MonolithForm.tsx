"use client";

import { useState } from "react";
import { Container } from "@/components/layout/Container";
import styles from "./MonolithForm.module.css";

const CATEGORIES = [
  { value: "xr-simulation", label: "XR & Simulation" },
  { value: "ai-automation", label: "AI & Automation" },
  { value: "hardware-sensors", label: "Hardware & Sensors" },
  { value: "data-intelligence", label: "Data & Intelligence" },
  { value: "training-operations", label: "Training & Operations" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "research-development", label: "Research & Development" },
  { value: "other", label: "Other" },
];

const ESTIMATED_VALUES = [
  { value: "under-50k", label: "Under 50K" },
  { value: "50k-250k", label: "50K – 250K" },
  { value: "250k-1m", label: "250K – 1M" },
  { value: "over-1m", label: "Over 1M" },
  { value: "unknown", label: "Not sure" },
];

type FormStatus = "idle" | "loading" | "submitted";

export function MonolithForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [honey, setHoney] = useState("");

  const loading = status === "loading";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setFieldErrors({});
    setServerError(null);

    try {
      const res = await fetch("/api/problem-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _honey: honey,
          title,
          description,
          category,
          estimated_value: estimatedValue || undefined,
          visibility,
          name: name || undefined,
          email: email || undefined,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        id?: string;
        errors?: Record<string, string>;
        message?: string;
      };

      if (json.success) {
        setStatus("submitted");
      } else if (json.errors) {
        setFieldErrors(json.errors);
        setStatus("idle");
      } else {
        setServerError(
          json.message ?? "Something went wrong. Please try again."
        );
        setStatus("idle");
      }
    } catch {
      setServerError("Could not reach the server. Please try again.");
      setStatus("idle");
    }
  }

  function reset() {
    setStatus("idle");
    setFieldErrors({});
    setServerError(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setEstimatedValue("");
    setName("");
    setEmail("");
    setVisibility("private");
    setHoney("");
  }

  if (status === "submitted") {
    return (
      <section>
        <Container>
          <div className={styles.success}>
            <p className={styles.successEyebrow}>Bring Your Problem</p>
            <h1 className={styles.successHeading}>Problem received.</h1>
            <p className={styles.successBody}>
              We review every submission personally. If this is a problem
              Centari can help with, we will be in touch.
            </p>
            <button className={styles.resetButton} onClick={reset}>
              Submit another →
            </button>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Container>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Bring Your Problem</p>
          <h1 className={styles.heading}>
            What does your
            <br />
            organisation need to solve?
          </h1>
          <p className={styles.subheading}>
            We review every submission. If the problem fits what Centari is
            building, we will respond directly.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Honeypot — filled only by bots, triggers silent rejection */}
          <div className={styles.honeypot} aria-hidden="true">
            <label htmlFor="website">Leave this blank</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honey}
              onChange={(e) => setHoney(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="title" className={styles.label}>
              Problem title <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              type="text"
              className={`${styles.input}${fieldErrors.title ? ` ${styles.inputError}` : ""}`}
              placeholder="One sentence that names the problem"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={200}
            />
            {fieldErrors.title && (
              <span className={styles.fieldError}>{fieldErrors.title}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Describe the problem <span className={styles.required}>*</span>
            </label>
            <textarea
              id="description"
              className={`${styles.textarea}${fieldErrors.description ? ` ${styles.inputError}` : ""}`}
              placeholder="What is the problem, who is affected, what have you tried?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              maxLength={5000}
              rows={6}
            />
            {fieldErrors.description && (
              <span className={styles.fieldError}>
                {fieldErrors.description}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="category" className={styles.label}>
                Category <span className={styles.required}>*</span>
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="category"
                  className={`${styles.select}${fieldErrors.category ? ` ${styles.inputError}` : ""}`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.category && (
                <span className={styles.fieldError}>
                  {fieldErrors.category}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="estimated_value" className={styles.label}>
                Estimated value
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="estimated_value"
                  className={styles.select}
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Not specified</option>
                  {ESTIMATED_VALUES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          <p className={styles.sectionLabel}>About you (optional)</p>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Name
              </label>
              <input
                id="name"
                type="text"
                className={`${styles.input}${fieldErrors.name ? ` ${styles.inputError}` : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                maxLength={100}
              />
              {fieldErrors.name && (
                <span className={styles.fieldError}>{fieldErrors.name}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`${styles.input}${fieldErrors.email ? ` ${styles.inputError}` : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                maxLength={254}
              />
              {fieldErrors.email && (
                <span className={styles.fieldError}>{fieldErrors.email}</span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Visibility</span>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                  disabled={loading}
                />
                Private — only Centari sees this
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  disabled={loading}
                />
                Public — visible on the problem board
              </label>
            </div>
          </div>

          {serverError && (
            <div className={styles.serverError} role="alert">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit problem"}
          </button>
        </form>
      </Container>
    </section>
  );
}
