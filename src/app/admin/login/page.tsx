import { loginAction } from "./actions";
import styles from "../curator.module.css";

export const metadata = { title: "Curator Login — Centari" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = params.error;
  const next = typeof params.next === "string" ? params.next : "/admin/signals";

  return (
    <div className={styles.loginShell}>
      <div className={styles.loginCard}>
        <p className={styles.kicker}>Centari Internal</p>
        <h1>Curator Console</h1>
        <form action={loginAction} className={styles.loginForm}>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="admin@centari.se"
            required
          />
          <label htmlFor="password">Access key</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter curator password"
            required
          />
          {error === "1" && (
            <p className={styles.loginError}>Incorrect password.</p>
          )}
          {error === "misconfigured" && (
            <p className={styles.loginError}>
              Admin credentials are not set in environment.
            </p>
          )}
          <button type="submit">Enter console</button>
        </form>
      </div>
    </div>
  );
}
