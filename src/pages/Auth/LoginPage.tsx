import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AuthLoginRequest } from '../../types/api';

function getRedirectTarget(search: string) {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/';
}

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(
    () => getRedirectTarget(location.search),
    [location.search],
  );

  const [form, setForm] = useState<AuthLoginRequest>({
    email: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.login(form);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Welcome back</div>
          <div className="auth-subtitle">Sign in to save designs and checkout.</div>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>

          {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

          <button
            type="submit"
            className="auth-button"
            disabled={submitting || auth.status === 'loading'}
          >
            {submitting || auth.status === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="auth-footer">
            <span style={{ opacity: 0.8 }}>New here?</span>{' '}
            <Link
              className="auth-link"
              to={`/register?next=${encodeURIComponent(redirectTo)}`}
            >
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
