import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AuthRegisterRequest } from '../../types/api';

function getRedirectTarget(search: string) {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/catalog';
}

type RegisterForm = AuthRegisterRequest & { confirmPassword: string };

export default function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(
    () => getRedirectTarget(location.search),
    [location.search],
  );

  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    region: '',
    address: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await auth.register({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        password: form.password,
        region: form.region || undefined,
        address: form.address || undefined,
      });

      setSuccess(res.message || 'Account created. Please verify OTP then login.');

      const next = encodeURIComponent(redirectTo);
      const email = encodeURIComponent(form.email);
      navigate(`/verify-otp?email=${email}&next=${next}`, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Create account</div>
          <div className="auth-subtitle">
            Start designing products in minutes.
          </div>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-grid">
            <label className="auth-field">
              <span>Full name</span>
              <input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
                placeholder="John Doe"
              />
            </label>

            <label className="auth-field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                required
                placeholder="+998901234567"
              />
            </label>

            <label className="auth-field auth-span-2">
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
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <input
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </label>

            <label className="auth-field">
              <span>Region (optional)</span>
              <input
                value={form.region}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                placeholder="Tashkent"
              />
            </label>

            <label className="auth-field">
              <span>Address (optional)</span>
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, building..."
              />
            </label>
          </div>

          {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}
          {success ? (
            <div className="auth-alert auth-alert--success">{success}</div>
          ) : null}

          <button
            type="submit"
            className="auth-button"
            disabled={submitting || auth.status === 'loading'}
          >
            {submitting || auth.status === 'loading' ? 'Creating…' : 'Create account'}
          </button>

          <div className="auth-footer">
            <span style={{ opacity: 0.8 }}>Already have an account?</span>{' '}
            <Link className="auth-link" to={`/login?next=${encodeURIComponent(redirectTo)}`}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
