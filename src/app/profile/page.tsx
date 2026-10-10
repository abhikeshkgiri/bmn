'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Profile = {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isVerified?: boolean;
  notificationPreferences?: { inApp: boolean; push: boolean };
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const response = await fetch('/api/profile');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load profile.');
        if (!cancelled) setProfile(result.data);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email || '',
          avatar: profile.avatar || '',
          notificationPreferences: profile.notificationPreferences,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const detail = result.error?.details?.[0]?.message;
        throw new Error(detail || result.error?.message || result.error || 'Unable to update profile.');
      }
      setProfile(result.data);
      setSuccess('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Account settings</h1>
      {loading ? (
        <p role="status">Loading your profile…</p>
      ) : (
        <Card className="space-y-4 p-6">
          <form className="space-y-4" onSubmit={(event) => void save(event)}>
            <Input
              label="Name"
              value={profile.name || ''}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              placeholder="Name"
              minLength={2}
              maxLength={100}
              required
            />
            <Input
              label="Email"
              value={profile.email || ''}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              placeholder="Email"
              type="email"
              maxLength={160}
            />
            <Input
              label="Profile photo URL"
              description="Photo uploads are not available yet. You may use an HTTPS image URL."
              value={profile.avatar || ''}
              onChange={(event) => setProfile({ ...profile, avatar: event.target.value })}
              placeholder="https://example.com/photo.jpg"
              type="url"
              maxLength={500}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {profile.isVerified ? 'Verified mobile number' : 'Mobile number'}
              </p>
              <p className="text-sm text-foreground-secondary">{profile.phone || 'Not available'}</p>
              <p className="text-xs text-foreground-muted">Changing this number requires OTP verification.</p>
            </div>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={profile.notificationPreferences?.inApp ?? true}
                onChange={(event) => setProfile({
                  ...profile,
                  notificationPreferences: {
                    inApp: event.target.checked,
                    push: profile.notificationPreferences?.push ?? true,
                  },
                })}
              />
              In-app notifications
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={profile.notificationPreferences?.push ?? true}
                onChange={(event) => setProfile({
                  ...profile,
                  notificationPreferences: {
                    inApp: profile.notificationPreferences?.inApp ?? true,
                    push: event.target.checked,
                  },
                })}
              />
              Push notifications
            </label>
            {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
            {success && <p role="status" className="text-sm text-success-700">{success}</p>}
            <Button type="submit" variant="primary" isLoading={saving}>Save changes</Button>
          </form>
        </Card>
      )}
    </main>
  );
}
