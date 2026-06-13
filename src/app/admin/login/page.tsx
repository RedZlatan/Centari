import { loginAction } from "./actions";
import styles from "../curator.module.css";

export const metadata = { title: "Curator Login — Centari" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <div className={styles.loginShell}>
      <div className={styles.loginCard}>
        <p className={styles.kicker}>Centari Internal</p>
        <h1>Curator Console</h1>
        <form action={loginAction} className={styles.loginForm}>
          <label htmlFor="password">Access key</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            placeholder="Enter curator password"
            required
          />
          {error === "1" && (
            <p className={styles.loginError}>Incorrect password.</p>
          )}
          {error === "misconfigured" && (
            <p className={styles.loginError}>
              CURATOR_PASSWORD is not set in environment.
            </p>
          )}
          <button type="submit">Enter console</button>
        </form>
      </div>
    </div>
  );
}
