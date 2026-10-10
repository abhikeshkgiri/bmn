'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { USER_ROLES } from '@/constants/roles';

type BarberFormState = {
  name: string;
  bio: string;
  profileImage: string;
  experienceYears: number;
  offersHomeService: boolean;
  homeServiceRadius: number;
};

export default function BarberProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BarberFormState>({
    name: '',
    bio: '',
    profileImage: '',
    experienceYears: 0,
    offersHomeService: false,
    homeServiceRadius: 10,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const auth = await fetch('/api/auth/me');
        if (!auth.ok) {
          router.push('/login');
          return;
        }

        const user = await auth.json();
        if (user?.user?.role !== USER_ROLES.BARBER) {
          setError('Access denied');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/dashboard/barber/profile');
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load barber profile');
        }

        const barber = result.data;
        setForm({
          name: barber.name || '',
          bio: barber.bio || '',
          profileImage: barber.profileImage || '',
          experienceYears: barber.experienceYears || 0,
          offersHomeService: !!barber.offersHomeService,
          homeServiceRadius: barber.homeServiceRadius || 10,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/barber/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
          profileImage: form.profileImage,
          experienceYears: form.experienceYears,
          offersHomeService: form.offersHomeService,
          homeServiceRadius: form.offersHomeService ? form.homeServiceRadius : undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to update barber profile');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update barber profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-pink font-medium">Barber profile</p>
            <h1 className="text-3xl font-bold text-foreground">Edit my profile</h1>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard/barber')}>Back</Button>
        </div>

        {error && <Card className="p-4 mb-4 text-red-600">{error}</Card>}

        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader><CardTitle>Professional details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Experience (years)</label>
                  <Input type="number" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-neutral-50 p-4">
                <p className="text-sm font-medium">Profile photograph</p>
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Current barber profile" className="mt-3 h-20 w-20 rounded-full object-cover" />
                ) : (
                  <p className="mt-2 text-sm text-foreground-secondary">No photograph uploaded.</p>
                )}
                <p className="mt-2 text-xs text-foreground-secondary">
                  Secure photo uploads are not configured yet. Your current image is preserved; URL edits are disabled.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-white min-h-[120px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={form.offersHomeService} onChange={(e) => setForm({ ...form, offersHomeService: e.target.checked })} />
                  Offers home service
                </label>
                {form.offersHomeService && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Home service radius (km)</label>
                    <Input type="number" value={form.homeServiceRadius} onChange={(e) => setForm({ ...form, homeServiceRadius: Number(e.target.value) || 10 })} />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
