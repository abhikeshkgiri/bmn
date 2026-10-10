'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { USER_ROLES } from '@/constants/roles';
import SupportedCitySelect from '@/components/location/SupportedCitySelect';
import { isSupportedSalonLocation, SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';

type SalonFormState = {
  name: string;
  description: string;
  contact: { phone: string; email: string; website: string };
  address: { addressLine1: string; area: string; city: string; state: string; postalCode: string; country: string };
  location: { latitude: string; longitude: string };
  openingHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;
};

const DAYS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
] as const;

const defaultOpeningHours = Object.fromEntries(
  DAYS.map(([day]) => [day, { isOpen: day !== 'sunday', openTime: '09:00', closeTime: '20:00' }])
);

export default function SalonProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SalonFormState>({
    name: '',
    description: '',
    contact: { phone: '', email: '', website: '' },
    address: { addressLine1: '', area: '', city: '', state: '', postalCode: '', country: 'India' },
    location: { latitude: '', longitude: '' },
    openingHours: defaultOpeningHours,
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
        if (![USER_ROLES.SALON_OWNER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.user?.role)) {
          setError('Access denied');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/dashboard/salon/profile');
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load salon profile');
        }

        const salon = result.data;
        setForm({
          name: salon.name || '',
          description: salon.description || '',
          contact: {
            phone: salon.contact?.phone || '',
            email: salon.contact?.email || '',
            website: salon.contact?.website || '',
          },
          address: {
            addressLine1: salon.address?.addressLine1 || '',
            area: salon.address?.area || '',
            city: salon.address?.city || '',
            state: salon.address?.state || '',
            postalCode: salon.address?.postalCode || '',
            country: salon.address?.country || 'India',
          },
          location: {
            latitude: String(salon.location?.coordinates?.[1] ?? ''),
            longitude: String(salon.location?.coordinates?.[0] ?? ''),
          },
          openingHours: Object.fromEntries(
            DAYS.map(([day]) => [day, {
              isOpen: salon.openingHours?.[day]?.isOpen ?? defaultOpeningHours[day].isOpen,
              openTime: salon.openingHours?.[day]?.openTime || '09:00',
              closeTime: salon.openingHours?.[day]?.closeTime || '20:00',
            }])
          ),
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
      const response = await fetch('/api/dashboard/salon/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          contact: form.contact,
          address: form.address,
          location: {
            type: 'Point',
            coordinates: [Number(form.location.longitude), Number(form.location.latitude)],
          },
          openingHours: form.openingHours,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to update salon profile');
      }

      router.replace('/salon/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update salon profile');
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
            <p className="text-sm uppercase tracking-wide text-brand-pink font-medium">Salon profile</p>
            <h1 className="text-3xl font-bold text-foreground">Edit salon details</h1>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard/salon')}>Back</Button>
        </div>

        {error && <Card className="p-4 mb-4 text-red-600">{error}</Card>}

        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader><CardTitle>Profile information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Salon name</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input value={form.contact.phone} onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })} />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-semibold">Opening hours</h2>
                <div className="space-y-3">
                  {DAYS.map(([day, label]) => (
                    <div key={day} className="grid grid-cols-1 items-center gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr]">
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={form.openingHours[day].isOpen}
                          onChange={(event) => setForm({
                            ...form,
                            openingHours: {
                              ...form.openingHours,
                              [day]: { ...form.openingHours[day], isOpen: event.target.checked },
                            },
                          })}
                        />
                        {label}
                      </label>
                      <Input
                        aria-label={`${label} opening time`}
                        type="time"
                        disabled={!form.openingHours[day].isOpen}
                        value={form.openingHours[day].openTime}
                        onChange={(event) => setForm({
                          ...form,
                          openingHours: {
                            ...form.openingHours,
                            [day]: { ...form.openingHours[day], openTime: event.target.value },
                          },
                        })}
                      />
                      <Input
                        aria-label={`${label} closing time`}
                        type="time"
                        disabled={!form.openingHours[day].isOpen}
                        value={form.openingHours[day].closeTime}
                        onChange={(event) => setForm({
                          ...form,
                          openingHours: {
                            ...form.openingHours,
                            [day]: { ...form.openingHours[day], closeTime: event.target.value },
                          },
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-white min-h-[120px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input value={form.contact.email} onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <Input value={form.contact.website} onChange={(e) => setForm({ ...form, contact: { ...form.contact, website: e.target.value } })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input value={form.address.addressLine1} onChange={(e) => setForm({ ...form, address: { ...form.address, addressLine1: e.target.value } })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SupportedCitySelect
                    value={form.address.city}
                    state={form.address.state}
                    label="Launch city"
                    required
                    onChange={(location) => setForm({
                      ...form,
                      address: { ...form.address, city: location.city, state: location.state },
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State / UT</label>
                  <Input value={SUPPORTED_LAUNCH_CITIES.find((location) => location.city === form.address.city)?.state || form.address.state} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Area / locality</label>
                  <Input value={form.address.area} onChange={(e) => setForm({ ...form, address: { ...form.address, area: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Postal code</label>
                  <Input value={form.address.postalCode} onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <Input value={form.address.country} onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <Input type="number" step="any" value={form.location.latitude} onChange={(e) => setForm({ ...form, location: { ...form.location, latitude: e.target.value } })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <Input type="number" step="any" value={form.location.longitude} onChange={(e) => setForm({ ...form, location: { ...form.location, longitude: e.target.value } })} required />
                </div>
              </div>
              {!isSupportedSalonLocation(form.address.city, form.address.state) && (
                <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  BookMyNai isn&apos;t available in this area yet. Choose a supported launch city before updating your salon.
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving || !isSupportedSalonLocation(form.address.city, form.address.state)}>{saving ? 'Saving...' : 'Save changes'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
