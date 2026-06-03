"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const DEMO_USERS = [
  { label: "Admin", email: "admin@sentinel.ai", password: "admin123" },
  { label: "Partner", email: "sarah@meridian.legal", password: "admin123" },
  { label: "Associate", email: "james@meridian.legal", password: "admin123" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filledUser, setFilledUser] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error) {
        setError("Invalid email or password");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  function fillCredentials(user: typeof DEMO_USERS[number]) {
    setEmail(user.email);
    setPassword(user.password);
    setFilledUser(user.label);
    setError(null);
  }

  const fieldCls =
    "w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-border-strong focus:outline-none transition-colors";

  return (
    <div className="flex justify-center px-4 pt-4 pb-12">
      <div className="w-full max-w-sm">
        <form onSubmit={onSubmit} className="rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
          <h1 className="mb-4 text-sm font-semibold text-text-primary">Sign in</h1>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Email</span>
            <input type="email" autoComplete="username" className={fieldCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Password</span>
            <input type="password" autoComplete="current-password" className={fieldCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {error ? (
            <div className="mb-3 rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--danger)", color: "var(--danger)", backgroundColor: "#FBE9E9" }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-3 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-md border border-border bg-surface px-4 py-3">
          <div className="mb-2 text-xs font-semibold text-text-primary">Quick-fill demo account</div>
          <div className="flex flex-wrap gap-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.label}
                type="button"
                onClick={() => fillCredentials(user)}
                className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                {user.label}
                {filledUser === user.label ? (
                  <span className="ml-1.5 text-text-muted">✓ filled</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-text-muted">
            All passwords: <span className="font-mono">admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
