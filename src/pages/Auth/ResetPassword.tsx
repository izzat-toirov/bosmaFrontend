import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { resetPassword } from '../../lib/api-client';

function getQueryParam(search: string, key: string) {
  const params = new URLSearchParams(search);
  return params.get(key) ?? '';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = useMemo(() => getQueryParam(location.search, 'email'), [location.search]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail && initialEmail !== email) {
      setEmail(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (otp.trim().length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      toast.success(res.message || 'Password reset successfully');
      navigate('/login', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Reset password</div>
          <div className="auth-subtitle">Use the OTP from your email to set a new password.</div>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="auth-field">
            <span>OTP code</span>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              required
              placeholder="123456"
            />
          </label>

          <label className="auth-field">
            <span>New password</span>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="auth-button" disabled={submitting}>
            {submitting ? 'Saving…' : 'Reset password'}
          </button>

          <div className="auth-footer">
            <Link className="auth-link" to="/login">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
