'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { USER_ROLES } from '@/constants/roles';
import { SALON_FACILITY_ARRAY } from '@/constants/services';
import SupportedCitySelect from '@/components/location/SupportedCitySelect';
import { isSupportedSalonLocation, SUPPORTED_LAUNCH_CITIES } from '@/constants/launch-cities';

type SalonFormState = {
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  images: string;
  facilities: string[];
  contact: { phone: string; email: string; website: string };
  address: {
    addressLine1: string;
    addressLine2: string;
    area: string;
    landmark: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  location: { latitude: string; longitude: string };
  openingHours: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;
};

type SalonProfilePayload = Partial<Omit<SalonFormState, 'contact' | 'address' | 'location' | 'openingHours' | 'images'>> & {
  images?: string[];
  contact?: Partial<SalonFormState['contact']>;
  address?: Partial<SalonFormState['address']>;
  location?: { coordinates?: number[] };
  openingHours?: Partial<SalonFormState['openingHours']>;
  isActive?: boolean;
  isVerified?: boolean;
  approvalStatus?: string | null;
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

function toSalonForm(salon: SalonProfilePayload): SalonFormState {
  return {
    name: salon.name || '',
    description: salon.description || '',
    logo: salon.logo || '',
    coverImage: salon.coverImage || '',
    images: (salon.images || []).join('\n'),
    facilities: salon.facilities || [],
    contact: {
      phone: salon.contact?.phone || '',
      email: salon.contact?.email || '',
      website: salon.contact?.website || '',
    },
    address: {
      addressLine1: salon.address?.addressLine1 || '',
      addressLine2: salon.address?.addressLine2 || '',
      area: salon.address?.area || '',
      landmark: salon.address?.landmark || '',
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
  };
}

export default function SalonProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [salonStatus, setSalonStatus] = useState<SalonProfilePayload | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<SalonFormState>({
    name: '',
    description: '',
    logo: '',
    coverImage: '',
    images: '',
    facilities: [],
    contact: { phone: '', email: '', website: '' },
    address: {
      addressLine1: '',
      addressLine2: '',
      area: '',
      landmark: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    location: { latitude: '', longitude: '' },
    openingHours: defaultOpeningHours,
  });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const auth = await fetch('/api/auth/me', { signal: controller.signal });
        if (!auth.ok) {
          router.replace('/login?next=%2Fdashboard%2Fsalon%2Fprofile');
          return;
        }

        const user = await auth.json();
        if (![USER_ROLES.SALON_OWNER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.user?.role)) {
          setError('Access denied');
          return;
        }

        const response = await fetch('/api/dashboard/salon/profile', { signal: controller.signal });
        const result = await response.json();
        if (response.status === 404 && result?.error?.code === 'SALON_NOT_FOUND') {
          setError('No salon profile is available for this account yet.');
          return;
        }
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load salon profile');
        }

        const salon = result.data as SalonProfilePayload;
        setSalonStatus(salon);
        setForm(toSalonForm(salon));
        setProfileLoaded(true);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [reloadKey, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/dashboard/salon/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          logo: form.logo,
          coverImage: form.coverImage,
          images: form.images.split(/\r?\n/).map((image) => image.trim()).filter(Boolean),
          facilities: form.facilities,
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
        const detailMessage = result?.error?.details
          ?.map((issue: { path?: (string | number)[]; message?: string }) =>
            `${issue.path?.join('.') || 'Profile'}: ${issue.message || 'Invalid value'}`
          )
          .join('; ');
        throw new Error(detailMessage || result?.error?.message || 'Failed to update salon profile');
      }

      const savedSalon = result.data as SalonProfilePayload;
      setSalonStatus(savedSalon);
      setForm(toSalonForm(savedSalon));
      setSuccessMessage(savedSalon.approvalStatus === 'PENDING'
        ? 'Profile saved. Changes are pending admin review and are not yet approved for publication.'
        : 'Profile saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update salon profile');
    } finally {
      setSaving(false);
    }
  };

  const isApproved = salonStatus?.approvalStatus === 'APPROVED' ||
    (!salonStatus?.approvalStatus && Boolean(salonStatus?.isVerified));
  const isPublic = Boolean(salonStatus?.isActive && isApproved);

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

        {error && (
          <Card className="mb-4 p-4" role="alert">
            <p className="mb-3 text-red-600">{error}</p>
            <div className="flex flex-wrap gap-3">
              {!profileLoaded && <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>}
              {error.startsWith('No salon profile') && (
                <Link href="/salon/onboarding"><Button type="button" variant="primary">Start onboarding</Button></Link>
              )}
            </div>
          </Card>
        )}
        {successMessage && <Card className="mb-4 p-4 text-green-800" role="status">{successMessage}</Card>}
        {salonStatus && (
          <Card className="mb-4 p-4">
            <p className="font-medium">Approval status: {salonStatus.approvalStatus || (salonStatus.isVerified ? 'Legacy verified' : 'Pending review')}</p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {isPublic
                ? 'This profile is currently approved and published.'
                : 'This profile is not currently published. Saving profile changes does not approve or publish it.'}
            </p>
          </Card>
        )}

        {profileLoaded && <form onSubmit={onSubmit}>
          <fieldset disabled={saving} className="min-w-0">
          <Card>
            <CardHeader><CardTitle>Profile information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="salon-name" className="block text-sm font-medium mb-1">Salon name</label>
                  <Input id="salon-name" required minLength={3} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="salon-phone" className="block text-sm font-medium mb-1">Phone</label>
                  <Input id="salon-phone" required value={form.contact.phone} onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })} />
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
                <label htmlFor="salon-description" className="block text-sm font-medium mb-1">Description</label>
                <textarea id="salon-description" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-white min-h-[120px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="salon-email" className="block text-sm font-medium mb-1">Email</label>
                  <Input id="salon-email" type="email" value={form.contact.email} onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })} />
                </div>
                <div>
                  <label htmlFor="salon-website" className="block text-sm font-medium mb-1">Website</label>
                  <Input id="salon-website" type="url" placeholder="https://" value={form.contact.website} onChange={(e) => setForm({ ...form, contact: { ...form.contact, website: e.target.value } })} />
                </div>
              </div>

              <div>
                <label htmlFor="salon-address" className="block text-sm font-medium mb-1">Address</label>
                <Input id="salon-address" required value={form.address.addressLine1} onChange={(e) => setForm({ ...form, address: { ...form.address, addressLine1: e.target.value } })} />
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
                  <label className="block text-sm font-medium mb-1">Address line 2</label>
                  <Input value={form.address.addressLine2} onChange={(e) => setForm({ ...form, address: { ...form.address, addressLine2: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Landmark</label>
                  <Input value={form.address.landmark} onChange={(e) => setForm({ ...form, address: { ...form.address, landmark: e.target.value } })} />
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
                  <Input type="number" min="-90" max="90" step="any" value={form.location.latitude} onChange={(e) => setForm({ ...form, location: { ...form.location, latitude: e.target.value } })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <Input type="number" min="-180" max="180" step="any" value={form.location.longitude} onChange={(e) => setForm({ ...form, location: { ...form.location, longitude: e.target.value } })} required />
                </div>
              </div>
              {!isSupportedSalonLocation(form.address.city, form.address.state) && (
                <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  BookMyNai isn&apos;t available in this area yet. Choose a supported launch city before updating your salon.
                </p>
              )}

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Photos and facilities</h2>
                <p className="text-sm text-foreground-secondary">Enter publicly accessible HTTP or HTTPS image URLs. This form does not upload or store image files.</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="salon-logo" className="block text-sm font-medium mb-1">Logo image URL</label>
                    <Input id="salon-logo" type="url" placeholder="https://" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="salon-cover" className="block text-sm font-medium mb-1">Cover image URL</label>
                    <Input id="salon-cover" type="url" placeholder="https://" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label htmlFor="salon-images" className="block text-sm font-medium mb-1">Additional image URLs</label>
                  <textarea id="salon-images" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 bg-white min-h-[100px]" aria-describedby="salon-images-help" />
                  <p id="salon-images-help" className="mt-1 text-sm text-foreground-secondary">Use one URL per line, up to 20 images.</p>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Facilities</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {SALON_FACILITY_ARRAY.map((facility) => (
                      <label key={facility} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.facilities.includes(facility)}
                          onChange={(event) => setForm({
                            ...form,
                            facilities: event.target.checked
                              ? [...form.facilities, facility]
                              : form.facilities.filter((item) => item !== facility),
                          })}
                        />
                        {facility.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" isLoading={saving} disabled={!isSupportedSalonLocation(form.address.city, form.address.state)}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
          </fieldset>
        </form>}
      </div>
    </div>
  );
}
