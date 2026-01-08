import { useAuth } from '../../context/AuthContext';

export default function DashboardHome() {
  const auth = useAuth();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Dashboard
      </h1>
      <div style={{ opacity: 0.85 }}>
        Signed in as <b>{auth.user?.fullName}</b> ({auth.user?.email})
      </div>

      <button
        onClick={() => void auth.logout()}
        style={{ marginTop: 16, padding: 10, fontWeight: 600 }}
      >
        Logout
      </button>
    </div>
  );
}
