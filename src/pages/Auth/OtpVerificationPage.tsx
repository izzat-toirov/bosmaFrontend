import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { sendOtp, verifyOtp } from '../../lib/api-client';

function getQueryParam(search: string, key: string) {
  const params = new URLSearchParams(search);
  return params.get(key) ?? '';
}

function getRedirectTarget(search: string) {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/catalog';
}

export default function OtpVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => getRedirectTarget(location.search), [location.search]);

  const [email, setEmail] = useState(() => getQueryParam(location.search, 'email'));
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [cooldown]);

  useEffect(() => {
    const initialEmail = getQueryParam(location.search, 'email');
    if (initialEmail && initialEmail !== email) {
      setEmail(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    // Auto-send OTP once when arriving with email
    const initialEmail = getQueryParam(location.search, 'email');
    if (!initialEmail) return;

    void (async () => {
      if (cooldown > 0) return;
      try {
        setSending(true);
        const res = await sendOtp({ email: initialEmail });
        toast.success(res.message || 'OTP sent to your email');
        setCooldown(60);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to send OTP');
      } finally {
        setSending(false);
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSendOtp() {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (cooldown > 0) return;

    setSending(true);
    try {
      const res = await sendOtp({ email: email.trim() });
      toast.success(res.message || 'OTP sent to your email');
      setCooldown(60);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (otpCode.trim().length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyOtp({ email: email.trim(), otpCode: otpCode.trim() });
      toast.success(res.message || 'Account verified. Please login.');

      const next = encodeURIComponent(redirectTo);
      navigate(`/login?next=${next}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Verify OTP</div>
          <div className="auth-subtitle">Enter the 6-digit code sent to your email.</div>
        </div>

        <form onSubmit={onVerify} className="auth-form">
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
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              required
              placeholder="123456"
            />
          </label>

          <div className="auth-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="auth-link"
              onClick={() => void onSendOtp()}
              disabled={sending || cooldown > 0}
              style={{ opacity: sending || cooldown > 0 ? 0.6 : 1 }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend OTP'}
            </button>

            <Link className="auth-link" to={`/login?next=${encodeURIComponent(redirectTo)}`}> 
              Back to login
            </Link>
          </div>

          <button type="submit" className="auth-button" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
