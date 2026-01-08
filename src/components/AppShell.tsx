import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, ShoppingBag, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../context/AuthModalContext';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'px-3 py-2 rounded-full text-sm font-semibold transition',
          'hover:bg-white/10 hover:text-white',
          isActive ? 'bg-white/12 text-white' : 'text-white/70',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppShell() {
  const auth = useAuth();
  const authModal = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();

  const isDesignerRoute = location.pathname.startsWith('/designer');

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }

    if (!userMenuOpen) return;
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [userMenuOpen]);

  async function onLogout() {
    setUserMenuOpen(false);
    await auth.logout();
    navigate('/catalog', { replace: true });
  }

  return (
    <div className="h-screen flex flex-col bg-[rgb(var(--bg))] text-white overflow-hidden">
      <header className="sticky top-0 z-50">
        <div className={isDesignerRoute ? 'w-full px-0' : 'mx-auto max-w-7xl px-4'}>
          <div
            className={
              isDesignerRoute
                ? 'rounded-none border-b border-white/10 bg-white/10 backdrop-blur-md'
                : 'mt-3 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.45)]'
            }
          >
            <div className={isDesignerRoute ? 'flex items-center justify-between px-4 py-3' : 'flex items-center justify-between px-4 py-3'}>
              <Link to="/catalog" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/90 to-cyan-300/70">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-extrabold tracking-tight">Bosma</div>
                  <div className="text-[11px] text-white/60">Print-on-demand</div>
                </div>
              </Link>

              <nav className="hidden items-center gap-1 md:flex">
                <NavItem to="/catalog">Catalog</NavItem>
                <NavItem to="/designer/1">Designer</NavItem>
                {auth.status === 'authenticated' ? (
                  <NavItem to="/orders">My Orders</NavItem>
                ) : null}
              </nav>

              <div className="flex items-center gap-2">
                <Link
                  to="/cart"
                  className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Cart
                </Link>

                {auth.status === 'authenticated' ? (
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden md:inline">{auth.user?.fullName ?? 'Account'}</span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </button>

                    {userMenuOpen ? (
                      <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(20,20,26,0.75)] backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
                        <div className="px-4 py-3 border-b border-white/10">
                          <div className="text-sm font-extrabold text-white/90">
                            {auth.user?.fullName ?? 'Account'}
                          </div>
                          <div className="text-xs text-white/60">{auth.user?.email}</div>
                        </div>

                        <div className="p-2">
                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                          >
                            <User className="h-4 w-4" />
                            View Profile / Edit Profile
                          </Link>

                          <Link
                            to="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            My Orders
                          </Link>

                          <button
                            type="button"
                            onClick={() => void onLogout()}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
                          >
                            <LogOut className="h-4 w-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      authModal.open({
                        tab: 'login',
                        title: 'Sign in to Bosma',
                        description:
                          'Login to save designs, sync assets, and checkout faster.',
                      })
                    }
                    className="rounded-full bg-gradient-to-r from-indigo-500/90 to-cyan-300/70 px-4 py-2 text-sm font-extrabold text-white shadow-[0_0_22px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(34,211,238,0.28)]"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={isDesignerRoute ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto'}>
        {isDesignerRoute ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
