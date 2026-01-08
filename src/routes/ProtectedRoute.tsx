import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'idle' || auth.status === 'loading') {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (auth.status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
