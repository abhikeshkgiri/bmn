'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import SupportedCitySelect from '@/components/location/SupportedCitySelect';
import { SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';

type SalonStatus = {
  _id: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  address: { city: string; state: string };
};

const openingHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  saturday: { isOpen: true, openTime: '10:00', closeTime: '20:00' },
  sunday: { isOpen: false, openTime: '09:00', closeTime: '20:00' },
};

export default function SalonOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [salon, setSalon] = useState<SalonStatus | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    addressLine1: '',
    area: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: '',
    longitude: '',
  });

  const loadOnboarding = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const authResponse = await fetch('/api/auth/me');
      if (!authResponse.ok) {
        router.replace('/login?next=%2Fsalon%2Fonboarding');
        return;
      }
      const auth = await authResponse.json();
      if (auth?.user?.role !== 'SALON_OWNER') {
        setError('Salon owner access is required to continue.');
        return;
      }

      const response = await fetch('/api/salon/onboarding');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to load salon onboarding.');
      }

      const existingSalon = result.data?.salon as SalonStatus | null;
      setSalon(existingSalon);
      if (
        existingSalon?.isActive &&
        existingSalon.isVerified &&
        (existingSalon.approvalStatus === 'APPROVED' || !existingSalon.approvalStatus)
      ) {
        router.replace('/dashboard/salon');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to load salon onboarding.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadOnboarding(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadOnboarding]);

  const submitSalon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const response = await fetch('/api/salon/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug,
          description: form.description.trim(),
          address: {
            addressLine1: form.addressLine1.trim(),
            area: form.area.trim(),
            city: form.city,
            state: form.state,
            postalCode: form.postalCode.trim(),
            country: 'India',
          },
          location: {
            type: 'Point',
            coordinates: [Number(form.longitude), Number(form.latitude)],
          },
          contact: {
            phone: form.phone.trim(),
            ...(form.email.trim() ? { email: form.email.trim() } : {}),
          },
          openingHours,
          facilities: [],
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to submit salon.');
      }
      await loadOnboarding();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to submit salon.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const approvalStatus = salon?.approvalStatus ?? (salon?.isVerified ? 'APPROVED' : 'PENDING');

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-pink">Salon Owner</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{salon ? 'Salon application status' : 'Create your salon profile'}</h1>
          <p className="mt-2 text-foreground-secondary">Submit your salon for administrator review before it appears in public discovery.</p>
        </header>

        {error && <Card className="border-red-200 p-4 text-red-700">{error}</Card>}

        {salon ? (
          <Card>
            <CardHeader><CardTitle>{salon.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p>
                Status:{' '}
                <strong>{approvalStatus === 'APPROVED' && salon.isActive && salon.isVerified ? 'Approved and published' : approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending admin review'}</strong>
              </p>
              <p className="text-sm text-foreground-secondary">{salon.address.city}, {salon.address.state}</p>
              {approvalStatus === 'REJECTED' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold">Administrator feedback</p>
                  <p className="mt-1 text-sm">{salon.rejectionReason || 'Please review your salon details and submit the corrected profile.'}</p>
                  <Link className="mt-3 inline-block font-semibold text-brand-pink" href="/dashboard/salon/profile">Edit details to resubmit</Link>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/salon"><Button variant="primary">Salon dashboard</Button></Link>
                <Button variant="outline" onClick={() => void loadOnboarding()}>Refresh status</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={submitSalon}>
            <Card>
              <CardHeader><CardTitle>Business details</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <Input label="Salon name" required minLength={3} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea className="min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2" maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Salon phone" type="tel" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                  <Input label="Salon email (optional)" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </div>
                <Input label="Street address" required value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Area / locality" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} />
                  <Input label="Postal code" required value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SupportedCitySelect
                    value={form.city}
                    state={form.state}
                    label="Launch city"
                    required
                    onChange={(location) => setForm({ ...form, city: location.city, state: location.state })}
                  />
                  <Input label="State / UT" value={SUPPORTED_LAUNCH_CITIES.find((location) => location.city === form.city)?.state || form.state} readOnly />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Latitude" type="number" min="-90" max="90" step="any" required value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
                  <Input label="Longitude" type="number" min="-180" max="180" step="any" required value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
                </div>
                <p className="text-sm text-foreground-secondary">Use the salon&apos;s actual map coordinates. This form does not accept external image URLs or substitute stock imagery; leave photos blank until an image-upload workflow is available.</p>
                <Button type="submit" variant="primary" disabled={saving || !form.city}>{saving ? <Spinner size="sm" /> : 'Submit salon for approval'}</Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </main>
  );
}
