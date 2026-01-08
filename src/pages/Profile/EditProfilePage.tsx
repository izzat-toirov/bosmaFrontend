import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient, apiPatch } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import type { AuthGetProfileResponse, AuthUpdateProfileRequest } from '../../types/api';

export default function EditProfilePage() {
  const auth = useAuth();

  const [form, setForm] = useState<AuthUpdateProfileRequest>({
    fullName: auth.user?.fullName ?? '',
    phone: auth.user?.phone ?? '',
    region: auth.user?.region ?? '',
    address: auth.user?.address ?? '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((p) => ({
      ...p,
      fullName: auth.user?.fullName ?? p.fullName ?? '',
      phone: auth.user?.phone ?? p.phone ?? '',
      region: auth.user?.region ?? p.region ?? '',
      address: auth.user?.address ?? p.address ?? '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<AuthGetProfileResponse>('/auth/profile', {
          withCredentials: true,
        });

        if (cancelled) return;

        const u = res.data;
        setForm({
          fullName: u?.fullName ?? '',
          phone: u?.phone ?? '',
          region: u?.region ?? '',
          address: u?.address ?? '',
        });
      } catch (e: any) {
        if (cancelled) return;
        toast.error(e?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.fullName?.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!form.phone?.trim()) {
      toast.error('Phone is required');
      return;
    }

    setSaving(true);
    try {
      const payload: AuthUpdateProfileRequest = {
        fullName: form.fullName?.trim(),
        phone: form.phone?.trim(),
        region: form.region?.trim() || undefined,
        address: form.address?.trim() || undefined,
      };

      await apiPatch<unknown, AuthUpdateProfileRequest>('/auth/profile', payload, {
        withCredentials: true,
      });

      toast.success('Profile updated successfully!');
      await auth.refreshProfile();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">Edit Profile</div>
          <div className="auth-subtitle">Update your contact and delivery details.</div>
        </div>

        {loading ? (
          <div className="auth-alert">Loading…</div>
        ) : (
          <form onSubmit={onSave} className="auth-form">
            <label className="auth-field">
              <span>Full Name</span>
              <input
                value={form.fullName ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                required
                placeholder="John Doe"
              />
            </label>

            <label className="auth-field">
              <span>Phone</span>
              <input
                value={form.phone ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                required
                placeholder="+998..."
              />
            </label>

            <label className="auth-field">
              <span>Region</span>
              <input
                value={form.region ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                placeholder="Tashkent"
              />
            </label>

            <label className="auth-field">
              <span>Address</span>
              <input
                value={form.address ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, building, apartment"
              />
            </label>

            <button type="submit" className="auth-button" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
