import { useState } from "react";
import { ShieldCheck, Target } from "lucide-react";
import { adminAPI, adminAuth } from "../services/adminApi";

export default function LoginPage({ onLogin, expired }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await adminAPI.login(form);
      const token = response.data?.data?.token;
      if (!token) throw new Error("Login did not return a session");
      adminAuth.setToken(token);
      onLogin(token);
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          failure.message ||
          "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="admin-console admin-login">
      <div className="admin-login-card">
        <div className="admin-brand">
          <span className="admin-brand-icon">
            <Target size={23} />
          </span>
          <span>
            WishTrail<small>OPERATIONS CONSOLE</small>
          </span>
        </div>
        <div className="admin-login-intro">
          <ShieldCheck size={26} />
          <h1>Welcome to your workspace</h1>
          <p className="admin-muted">
            Sign in to manage the WishTrail journey.
          </p>
        </div>
        {expired && (
          <p className="admin-notice" role="status">
            Your admin session expired or your IP changed. Please sign in again.
          </p>
        )}
        <form onSubmit={submit}>
          <label>
            Email
            <input
              autoComplete="username"
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              required
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>
          {error && (
            <p className="admin-error-text" role="alert">
              {error}
            </p>
          )}
          <button
            className="admin-button admin-button-primary"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="admin-muted admin-login-footer">
          Restricted to authorized administrators.
        </p>
      </div>
    </main>
  );
}
