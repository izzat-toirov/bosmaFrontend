import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { forgotPassword } from '../../lib/api-client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await forgotPassword({ email: email.trim() });
      toast.success(res.message || 'If the email exists, an OTP has been sent.');
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to request password reset');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Forgot password</div>
          <div className="auth-subtitle">We’ll email you an OTP to reset your password.</div>
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

          <button type="submit" className="auth-button" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send OTP'}
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
