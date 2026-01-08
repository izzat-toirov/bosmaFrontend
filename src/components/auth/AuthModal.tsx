import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '../../context/AuthContext';
import { useAuthModal } from '../../context/AuthModalContext';
import type { AuthLoginRequest } from '../../types/api';

type RegisterForm = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  region?: string;
  address?: string;
};

export default function AuthModal() {
  const auth = useAuth();
  const modal = useAuthModal();

  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState<AuthLoginRequest>({
    email: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    region: '',
    address: '',
  });

  useEffect(() => {
    if (!modal.isOpen) {
      setSubmitting(false);
    }
  }, [modal.isOpen]);

  const defaultTitle = useMemo(
    () => modal.title ?? 'Continue with your account',
    [modal.title],
  );

  const defaultDescription = useMemo(
    () =>
      modal.description ??
      'Login or create an account to add items to cart and checkout.',
    [modal.description],
  );

  async function afterAuthed() {
    toast.success('Signed in successfully');
    const cb = modal.onAuthed;
    modal.close();
    if (cb) await cb();
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await auth.login(loginForm);
      await afterAuthed();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match');
      setSubmitting(false);
      return;
    }

    try {
      const res = await auth.register({
        fullName: registerForm.fullName,
        phone: registerForm.phone,
        email: registerForm.email,
        password: registerForm.password,
        region: registerForm.region || undefined,
        address: registerForm.address || undefined,
      });

      toast.success(res.message || 'Account created. Please verify OTP then login.');
      modal.setTab('login');
    } catch (err: any) {
      toast.error(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open={modal.isOpen}
      onOpenChange={(open: boolean) => (open ? null : modal.close())}
    >
      <AnimatePresence>
        {modal.isOpen ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/55"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <div className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <Dialog.Title className="text-lg font-extrabold text-white/90">
                      {defaultTitle}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-white/60">
                      {defaultDescription}
                    </Dialog.Description>
                  </div>

                  <Dialog.Close asChild>
                    <button className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10">
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="px-5 pb-5">
                  <Tabs.Root
                    value={modal.tab}
                    onValueChange={(v: string) => modal.setTab(v as any)}
                  >
                    <Tabs.List className="grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
                      <Tabs.Trigger
                        value="login"
                        className="rounded-lg py-2 text-sm font-extrabold text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white"
                      >
                        Login
                      </Tabs.Trigger>
                      <Tabs.Trigger
                        value="register"
                        className="rounded-lg py-2 text-sm font-extrabold text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white"
                      >
                        Register
                      </Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="login" className="mt-4">
                      <form onSubmit={onLogin} className="grid gap-3">
                        <label className="grid gap-1">
                          <span className="text-xs text-white/70">Email</span>
                          <input
                            className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                            value={loginForm.email}
                            onChange={(e) =>
                              setLoginForm((p) => ({ ...p, email: e.target.value }))
                            }
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="you@example.com"
                          />
                        </label>

                        <label className="grid gap-1">
                          <span className="text-xs text-white/70">Password</span>
                          <input
                            className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                            value={loginForm.password}
                            onChange={(e) =>
                              setLoginForm((p) => ({ ...p, password: e.target.value }))
                            }
                            type="password"
                            autoComplete="current-password"
                            required
                            minLength={6}
                            placeholder="••••••••"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={submitting || auth.status === 'loading'}
                          className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-500/90 to-cyan-300/70 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_0_22px_rgba(99,102,241,0.35)] disabled:opacity-70"
                        >
                          {submitting || auth.status === 'loading' ? 'Signing in…' : 'Sign in'}
                        </button>
                      </form>
                    </Tabs.Content>

                    <Tabs.Content value="register" className="mt-4">
                      <form onSubmit={onRegister} className="grid gap-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="grid gap-1">
                            <span className="text-xs text-white/70">Full name</span>
                            <input
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                              value={registerForm.fullName}
                              onChange={(e) =>
                                setRegisterForm((p) => ({
                                  ...p,
                                  fullName: e.target.value,
                                }))
                              }
                              required
                              placeholder="John Doe"
                            />
                          </label>

                          <label className="grid gap-1">
                            <span className="text-xs text-white/70">Phone</span>
                            <input
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                              value={registerForm.phone}
                              onChange={(e) =>
                                setRegisterForm((p) => ({ ...p, phone: e.target.value }))
                              }
                              required
                              placeholder="+998901234567"
                            />
                          </label>
                        </div>

                        <label className="grid gap-1">
                          <span className="text-xs text-white/70">Email</span>
                          <input
                            className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                            value={registerForm.email}
                            onChange={(e) =>
                              setRegisterForm((p) => ({ ...p, email: e.target.value }))
                            }
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="you@example.com"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="grid gap-1">
                            <span className="text-xs text-white/70">Password</span>
                            <input
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                              value={registerForm.password}
                              onChange={(e) =>
                                setRegisterForm((p) => ({
                                  ...p,
                                  password: e.target.value,
                                }))
                              }
                              type="password"
                              autoComplete="new-password"
                              required
                              minLength={6}
                              placeholder="••••••••"
                            />
                          </label>

                          <label className="grid gap-1">
                            <span className="text-xs text-white/70">Confirm</span>
                            <input
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                              value={registerForm.confirmPassword}
                              onChange={(e) =>
                                setRegisterForm((p) => ({
                                  ...p,
                                  confirmPassword: e.target.value,
                                }))
                              }
                              type="password"
                              autoComplete="new-password"
                              required
                              minLength={6}
                              placeholder="••••••••"
                            />
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="mt-1 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-white/15 disabled:opacity-70"
                        >
                          {submitting ? 'Creating…' : 'Create account'}
                        </button>

                        <div className="text-xs text-white/60">
                          After registration you must verify OTP before you can login.
                        </div>
                      </form>
                    </Tabs.Content>
                  </Tabs.Root>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
