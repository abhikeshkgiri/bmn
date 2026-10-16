'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { SALON_FACILITY_ARRAY, SALON_TYPE_ARRAY } from '@/constants/services';
import SalonApplicationRequirements from '@/components/salon/SalonApplicationRequirements';
import SalonFileUpload, { type SalonUploadResult } from '@/components/salon/SalonFileUpload';

type SalonStatus = {
  _id: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  approvalStatus?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  salonType?: string;
  description?: string;
  logo?: string | null;
  coverImage?: string | null;
  images?: string[];
  address: { addressLine1?: string; addressLine2?: string; area?: string; landmark?: string; city: string; state: string; postalCode?: string };
  location?: { coordinates?: number[] };
  contact?: { phone?: string; email?: string; website?: string };
  socialLinks?: { instagram?: string; facebook?: string; youtube?: string };
  openingHours?: Record<string, { isOpen: boolean; openTime?: string; closeTime?: string }>;
  facilities?: string[];
  identityDocuments?: { aadhaar: boolean; pan: boolean };
  services?: Array<{ _id: string; name: string; category: string; price: number; discountPrice?: number | null; duration: number; displayOrder?: number; isActive: boolean }>;
  barbers?: Array<{ _id: string; name: string; title?: string; experienceYears: number; specializations: string[]; isActive: boolean }>;
  readiness?: { activeServiceCount: number; barberProfileCount: number; hasAadhaarDocument?: boolean; hasPanDocument?: boolean; blockers: string[] };
}

function isSalonStatus(value: unknown): value is SalonStatus {
  if (typeof value !== 'object' || value === null) return false;
  const salon = value as Record<string, unknown>;
  const address = salon.address;
  return (
    typeof salon._id === 'string' &&
    typeof salon.name === 'string' &&
    typeof salon.isActive === 'boolean' &&
    typeof salon.isVerified === 'boolean' &&
    typeof address === 'object' &&
    address !== null &&
    'city' in address &&
    typeof address.city === 'string' &&
    'state' in address &&
    typeof address.state === 'string'
  );
}

function isSalonReadiness(value: unknown): value is NonNullable<SalonStatus['readiness']> {
  if (typeof value !== 'object' || value === null) return false;
  const readiness = value as Record<string, unknown>;
  return (
    typeof readiness.activeServiceCount === 'number' &&
    typeof readiness.barberProfileCount === 'number' &&
    Array.isArray(readiness.blockers) &&
    readiness.blockers.every((blocker) => typeof blocker === 'string')
  );
}

const DAYS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
] as const;

type OpeningHoursForm = Record<(typeof DAYS)[number][0], { isOpen: boolean; openTime: string; closeTime: string }>;

const defaultOpeningHours: OpeningHoursForm = Object.fromEntries(
  DAYS.map(([day]) => [day, { isOpen: day !== 'sunday', openTime: '09:00', closeTime: '20:00' }])
) as OpeningHoursForm;

type OnboardingForm = {
  name: string;
  salonType: string;
  description: string;
  logo: string;
  coverImage: string;
  images: string[];
  facilities: string[];
  phone: string;
  email: string;
  website: string;
  socialLinks: { instagram: string; facebook: string; youtube: string };
  addressLine1: string;
  addressLine2: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  openingHours: OpeningHoursForm;
};

export default function SalonOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [salon, setSalon] = useState<SalonStatus | null>(null);
  const [postalLookupStatus, setPostalLookupStatus] = useState<'idle' | 'loading' | 'matched' | 'unsupported' | 'error'>('idle');
  const [postalLookupMessage, setPostalLookupMessage] = useState('');
  const [form, setForm] = useState<OnboardingForm>({
    name: '',
    salonType: '',
    description: '',
    logo: '',
    coverImage: '',
    images: [],
    facilities: [],
    phone: '',
    email: '',
    website: '',
    socialLinks: { instagram: '', facebook: '', youtube: '' },
    addressLine1: '',
    addressLine2: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    openingHours: defaultOpeningHours,
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

      const salonData = result.data?.salon;
      const readiness = isSalonReadiness(result.data?.readiness) ? result.data.readiness : undefined;
      const existingSalon = isSalonStatus(salonData)
        ? { ...salonData, ...(readiness ? { readiness } : {}) }
        : null;
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

  useEffect(() => {
    if (form.postalCode.length !== 6) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setPostalLookupStatus('loading');
      setPostalLookupMessage('');
      try {
        const response = await fetch(`/api/location/pincode?postalCode=${encodeURIComponent(form.postalCode)}`, {
          signal: controller.signal,
        });
        const result = await response.json() as {
          success?: boolean;
          data?: { city?: string; state?: string; supported?: boolean };
          error?: { message?: string };
        };
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error?.message || 'Unable to look up this PIN code.');
        }
        setForm((current) => ({
          ...current,
          city: result.data?.city || '',
          state: result.data?.state || '',
        }));
        if (result.data.supported) {
          setPostalLookupStatus('matched');
          setPostalLookupMessage(`Detected ${result.data.city}, ${result.data.state}.`);
        } else {
          setPostalLookupStatus('unsupported');
          setPostalLookupMessage(`State detected: ${result.data.state}. Salon onboarding is not available for this PIN code yet.`);
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        setPostalLookupStatus('error');
        setPostalLookupMessage(reason instanceof Error ? reason.message : 'Unable to look up this PIN code.');
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [form.postalCode]);

  const submitSalon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewing) {
      setReviewing(true);
      setError('');
      return;
    }
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const response = await fetch('/api/salon/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          salonType: form.salonType,
          slug,
          description: form.description.trim(),
          logo: form.logo.trim(),
          coverImage: form.coverImage.trim(),
          images: form.images.map((image) => image.trim()).filter(Boolean),
          facilities: form.facilities,
          socialLinks: form.socialLinks,
          address: {
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim(),
            area: form.area.trim(),
            landmark: form.landmark.trim(),
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
            website: form.website.trim(),
          },
          openingHours: form.openingHours,
        }),
      });
      const result = await response.json() as {
        success?: boolean;
        data?: unknown;
        error?: {
          message?: string;
          details?: Array<{ path?: Array<string | number>; message?: string }>;
        };
      };
      if (!response.ok || !result.success) {
        const validationMessages = result.error?.details
          ?.map((issue) => issue.path?.length
            ? `${issue.path.join('.')}: ${issue.message || 'Invalid value'}`
            : issue.message)
          .filter((message): message is string => Boolean(message));
        throw new Error(validationMessages?.join('. ') || result.error?.message || 'Failed to save salon draft.');
      }
      if (!isSalonStatus(result.data)) throw new Error('The server response did not confirm the salon status. Refresh the page to check.');
      setSalon(result.data);
      setReviewing(false);
      await loadOnboarding();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to save salon draft.');
    } finally {
      setSaving(false);
    }
  };

  const submitSavedSalon = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/salon/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.error?.message || 'Failed to submit salon application.');
      }
      if (!isSalonStatus(result.data)) throw new Error('The server did not confirm the submitted status. Refresh to check.');
      setSalon(result.data);
      setReviewing(false);
      await loadOnboarding();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to submit salon application.');
    } finally {
      setSaving(false);
    }
  };

  const handleIdentityUpload = (result: SalonUploadResult) => {
    if (result.uploaded) void loadOnboarding();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const approvalStatus = salon?.approvalStatus ?? (salon?.isVerified ? 'APPROVED' : 'PENDING');

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-pink">Salon Owner</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{salon?.approvalStatus === 'DRAFT' ? reviewing ? 'Review salon application' : 'Complete your salon application' : salon ? 'Salon application status' : reviewing ? 'Review salon details' : 'Create your salon profile'}</h1>
          <p className="mt-2 text-foreground-secondary">Complete and review your actual salon details before submitting for administrator review. Only approved, active salons in supported cities appear publicly.</p>
        </header>

        {error && <Card className="border-red-200 p-4 text-red-700">{error}</Card>}

        {salon && approvalStatus === 'DRAFT' && reviewing ? (
          <Card>
            <CardHeader><CardTitle>Review saved application before submitting</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <section>
                <h2 className="font-semibold">{salon.name} · {salon.salonType?.replace(/_/g, ' ') || 'Salon type unavailable'}</h2>
                <p>{[salon.address.addressLine1, salon.address.addressLine2, salon.address.area, salon.address.landmark, salon.address.city, salon.address.state, salon.address.postalCode].filter(Boolean).join(', ')}</p>
                <p className="text-sm text-foreground-secondary">{[salon.contact?.phone, salon.contact?.email, salon.contact?.website].filter(Boolean).join(' · ')}</p>
                {salon.location?.coordinates && <p className="text-sm text-foreground-secondary">Map coordinates: {salon.location.coordinates[1]}, {salon.location.coordinates[0]}</p>}
                <p className="break-all text-sm text-foreground-secondary">Social links: {Object.entries(salon.socialLinks || {}).filter(([, value]) => value).map(([network, value]) => `${network}: ${value}`).join(' · ') || 'None supplied'}</p>
                {salon.description && <p className="mt-2 whitespace-pre-wrap">{salon.description}</p>}
              </section>
              <section>
                <h3 className="font-medium">Saved photos</h3>
                <div className="mt-2 flex flex-wrap gap-3">
                  {salon.logo && <img src={salon.logo} alt="Saved salon logo" className="h-20 w-20 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                  {salon.coverImage && <img src={salon.coverImage} alt="Saved salon cover" className="h-20 w-32 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                  {salon.images?.map((image, index) => <img key={`${index}-${image}`} src={image} alt={`Saved salon gallery ${index + 1}`} className="h-20 w-32 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />)}
                  {!salon.logo && !salon.coverImage && !salon.images?.length && <p className="text-sm text-foreground-secondary">No photos saved.</p>}
                </div>
              </section>
              <section>
                <h3 className="font-medium">Saved opening hours</h3>
                <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                  {DAYS.map(([day, label]) => {
                    const hours = salon.openingHours?.[day];
                    return <li key={day}>{label}: {!hours ? 'Not provided' : hours.isOpen ? `${hours.openTime || '—'}–${hours.closeTime || '—'}` : 'Closed'}</li>;
                  })}
                </ul>
                <p className="mt-1 text-sm">Facilities: {salon.facilities?.map((facility) => facility.replace(/_/g, ' ')).join(', ') || 'None selected'}</p>
              </section>
              <section>
                <h3 className="font-medium">Saved services</h3>
                {salon.services?.length ? (
                  <ul className="mt-1 space-y-1 text-sm">
                    {salon.services.map((service) => <li key={service._id}>{service.name} · {service.category} · {service.discountPrice != null && service.discountPrice < service.price ? `₹${service.discountPrice / 100} (was ₹${service.price / 100})` : `₹${service.price / 100}`} · {service.duration} min · {service.isActive ? 'Active' : 'Inactive'}</li>)}
                  </ul>
                ) : <p className="text-sm text-foreground-secondary">No services saved.</p>}
              </section>
              <section>
                <h3 className="font-medium">Saved barber team</h3>
                {salon.barbers?.length ? (
                  <ul className="mt-1 space-y-1 text-sm">
                    {salon.barbers.map((barber) => <li key={barber._id}>{barber.name}{barber.title ? ` · ${barber.title}` : ''} · {barber.experienceYears} years · {barber.specializations.join(', ') || 'No specialties'} · {barber.isActive ? 'Active' : 'Inactive'}</li>)}
                  </ul>
                ) : <p className="text-sm text-foreground-secondary">No barber profiles saved.</p>}
              </section>
              <section aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold">Submission readiness</h3>
                {!salon.readiness ? (
                  <p className="text-sm text-amber-900">Readiness checks were not loaded. Refresh before submitting.</p>
                ) : salon.readiness.blockers.length ? (
                  <ul className="mt-1 list-inside list-disc text-sm text-amber-900">{salon.readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
                ) : <p className="text-sm text-amber-900">The saved application meets the current submission requirements.</p>}
              </section>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setReviewing(false)}>Back to checklist</Button>
                <Button type="button" variant="primary" disabled={saving || !salon.readiness || Boolean(salon.readiness.blockers.length)} onClick={() => void submitSavedSalon()}>{saving ? <Spinner size="sm" /> : 'Submit for admin review'}</Button>
                <Button type="button" variant="outline" disabled={saving} onClick={() => void loadOnboarding()}>Refresh saved details</Button>
              </div>
            </CardContent>
          </Card>
        ) : salon?.approvalStatus === 'DRAFT' ? (
          <Card>
            <CardHeader><CardTitle>{salon.name} · Services and barber team</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-foreground-secondary">
                Your salon details are saved as a draft. Add a service, then add a barber and select the services they offer. When both steps are complete, review the full profile and submit it to the administrator.
              </p>
              <SalonApplicationRequirements
                salonId={salon._id}
                services={salon.services ?? []}
                barbers={salon.barbers ?? []}
                activeServiceCount={salon.readiness?.activeServiceCount ?? 0}
                barberProfileCount={salon.readiness?.barberProfileCount ?? 0}
                onSaved={loadOnboarding}
              />
              <section className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h3 className="font-semibold">Owner identity documents</h3>
                  <p className="mt-1 text-sm text-foreground-secondary">Upload Aadhaar and PAN here. Both are required before the application can be submitted for review.</p>
                </div>
                <SalonFileUpload
                  kind="aadhaar"
                  label="Salon owner Aadhaar (PDF, JPG, PNG; max 10 MB)"
                  accept="application/pdf,image/jpeg,image/png"
                  currentUploaded={salon.identityDocuments?.aadhaar}
                  required
                  onUploaded={handleIdentityUpload}
                />
                <SalonFileUpload
                  kind="pan"
                  label="Salon owner PAN (PDF, JPG, PNG; max 10 MB)"
                  accept="application/pdf,image/jpeg,image/png"
                  currentUploaded={salon.identityDocuments?.pan}
                  required
                  onUploaded={handleIdentityUpload}
                />
                {salon.identityDocuments?.aadhaar && <a className="text-sm font-medium text-brand-pink underline" href="/api/salon/onboarding/documents?kind=aadhaar">Download saved Aadhaar</a>}
                {salon.identityDocuments?.pan && <a className="text-sm font-medium text-brand-pink underline" href="/api/salon/onboarding/documents?kind=pan">Download saved PAN</a>}
                <p className="text-xs text-foreground-secondary sm:col-span-2">Identity documents are encrypted in private storage and visible only to the salon owner and administrators.</p>
              </section>
              {!salon.readiness ? (
                <p className="text-sm text-amber-800">Readiness checks are unavailable. Refresh to try again.</p>
              ) : salon.readiness.activeServiceCount < 1 || salon.readiness.barberProfileCount < 1 ? (
                <p className="text-sm text-amber-800">{salon.readiness.blockers.filter((blocker) => !blocker.includes('Aadhaar') && !blocker.includes('PAN')).join(' ')}</p>
              ) : (
                <Button type="button" variant="primary" onClick={() => setReviewing(true)}>Review profile and submit for admin review</Button>
              )}
            </CardContent>
          </Card>
        ) : salon ? (
          <Card>
            <CardHeader><CardTitle>{salon.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p>
                Status:{' '}
                <strong>
                  {approvalStatus === 'DRAFT'
                    ? 'Draft — not submitted'
                    : approvalStatus === 'REJECTED'
                      ? 'Rejected'
                    : approvalStatus === 'APPROVED'
                      ? salon.isActive && salon.isVerified
                        ? 'Approved and published'
                        : 'Approved, but not currently published'
                      : 'Pending admin review'}
                </strong>
              </p>
              <p className="text-sm text-foreground-secondary">{salon.address.city}, {salon.address.state}</p>
              {salon.salonType && <p className="text-sm text-foreground-secondary">Type: {salon.salonType.replace(/_/g, ' ')}</p>}
              {approvalStatus === 'REJECTED' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold">Administrator feedback</p>
                  <p className="mt-1 text-sm">{salon.rejectionReason || 'Please review your salon details and submit the corrected profile.'}</p>
                  <Link className="mt-3 inline-block font-semibold text-brand-pink" href="/dashboard/salon/profile">Edit details to resubmit</Link>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/salon/profile"><Button variant="outline">Profile, photos and hours</Button></Link>
                {approvalStatus !== 'DRAFT' && (
                  <>
                    <Link href="/salon/services"><Button variant="outline">Manage services and prices</Button></Link>
                    <Link href="/salon/barbers"><Button variant="outline">Manage barber team</Button></Link>
                  </>
                )}
                <Link href="/dashboard/salon"><Button variant="primary">Salon dashboard</Button></Link>
                <Button variant="outline" onClick={() => void loadOnboarding()}>Refresh status</Button>
              </div>
              <p className="text-sm text-foreground-secondary">Owner-managed barber profiles do not need separate accounts.</p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={submitSalon}>
            {reviewing ? (
              <Card>
                <CardHeader><CardTitle>Review salon details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h2 className="font-semibold">{form.name} · {form.salonType.replace(/_/g, ' ')}</h2>
                    <p>{[form.addressLine1, form.addressLine2, form.area, form.city, form.state, form.postalCode].filter(Boolean).join(', ')}</p>
                    <p className="text-sm text-foreground-secondary">{[form.phone, form.email, form.website].filter(Boolean).join(' · ')}</p>
                    <p className="text-sm text-foreground-secondary">Map coordinates: {form.latitude}, {form.longitude}</p>
                    <p className="break-all text-sm text-foreground-secondary">Social: {Object.entries(form.socialLinks).filter(([, value]) => value).map(([network, value]) => `${network}: ${value}`).join(' · ') || 'None supplied'}</p>
                    {form.description && <p className="mt-2 whitespace-pre-wrap">{form.description}</p>}
                  </div>
                  <div>
                    <h3 className="font-medium">Opening hours</h3>
                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                      {DAYS.map(([day, label]) => {
                        const hours = form.openingHours[day];
                        return <li key={day}>{label}: {hours.isOpen ? `${hours.openTime}–${hours.closeTime}` : 'Closed'}</li>;
                      })}
                    </ul>
                  </div>
                  <p className="text-sm">Facilities: {form.facilities.length ? form.facilities.map((item) => item.replace(/_/g, ' ')).join(', ') : 'None selected'}</p>
                  <div className="flex flex-wrap gap-3">
                    {form.logo && <img src={form.logo} alt="Salon logo preview" className="h-20 w-20 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                    {form.coverImage && <img src={form.coverImage} alt="Salon cover preview" className="h-20 w-32 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                    {form.images.filter((image) => image.trim()).map((image, index) => <img key={`${index}-${image}`} src={image} alt={`Salon gallery preview ${index + 1}`} className="h-20 w-32 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />)}
                  </div>
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Save these details as a draft to unlock the service and barber steps on this page. Add a barber after saving a service, then assign the barber to that service before submitting for review.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" disabled={saving} onClick={() => setReviewing(false)}>Back to edit</Button>
                    <Button type="submit" variant="primary" disabled={saving}>{saving ? <Spinner size="sm" /> : 'Save draft and continue to services'}</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                <Card>
                  <CardHeader><CardTitle>Business profile and contact</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Salon name" required minLength={3} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                      <label className="block text-sm font-medium">Salon type
                        <select className="mt-1 w-full rounded-lg border border-border bg-white p-3" required value={form.salonType} onChange={(event) => setForm({ ...form, salonType: event.target.value })}>
                          <option value="">Choose a type</option>
                          {SALON_TYPE_ARRAY.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm font-medium">Description
                      <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2" maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Salon phone" type="tel" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                      <Input label="Salon email (optional)" type="email" maxLength={160} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                      <Input label="Website (optional)" type="url" placeholder="https://" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
                      <SalonFileUpload kind="logo" label="Salon logo (optional; JPG, PNG, WebP; max 8 MB)" accept="image/jpeg,image/png,image/webp" previewUrl={form.logo || undefined} onUploaded={(result) => { if (result.url) setForm((current) => ({ ...current, logo: result.url || '' })); }} />
                      <SalonFileUpload kind="cover" label="Salon cover photo (optional; JPG, PNG, WebP; max 8 MB)" accept="image/jpeg,image/png,image/webp" previewUrl={form.coverImage || undefined} onUploaded={(result) => { if (result.url) setForm((current) => ({ ...current, coverImage: result.url || '' })); }} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(['instagram', 'facebook', 'youtube'] as const).map((network) => (
                        <Input key={network} label={`${network[0].toUpperCase() + network.slice(1)} URL (optional)`} type="url" placeholder="https://" value={form.socialLinks[network]} onChange={(event) => setForm({ ...form, socialLinks: { ...form.socialLinks, [network]: event.target.value } })} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Address and map location</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Input label="Street address" required value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Address line 2 (optional)" value={form.addressLine2} onChange={(event) => setForm({ ...form, addressLine2: event.target.value })} />
                      <Input label="Area / locality" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} />
                      <Input label="Landmark (optional)" value={form.landmark} onChange={(event) => setForm({ ...form, landmark: event.target.value })} />
                      <Input
                        label="Postal code"
                        required
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={form.postalCode}
                        onChange={(event) => {
                          setPostalLookupStatus('idle');
                          setPostalLookupMessage('');
                          setForm((current) => ({
                            ...current,
                            postalCode: event.target.value.replace(/\D/g, '').slice(0, 6),
                            city: '',
                            state: '',
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Input label="State / UT (detected from PIN code)" value={form.state} readOnly />
                      {postalLookupMessage && (
                        <p role={postalLookupStatus === 'error' || postalLookupStatus === 'unsupported' ? 'alert' : 'status'} className={`text-sm ${postalLookupStatus === 'error' || postalLookupStatus === 'unsupported' ? 'text-error-700' : 'text-foreground-secondary'}`}>
                          {postalLookupStatus === 'loading' ? 'Detecting your location…' : postalLookupMessage}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Latitude" type="number" min="-90" max="90" step="any" required value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
                      <Input label="Longitude" type="number" min="-180" max="180" step="any" required value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
                    </div>
                    <p className="text-sm text-foreground-secondary">Enter the salon&apos;s actual map coordinates. The coordinates are validated on the server and used for discovery and directions.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Photos, facilities and hours</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-3">
                      {form.images.map((image, index) => (
                        <div key={`${index}-${image}`} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                          {image && <img src={image} alt={`Gallery preview ${index + 1}`} className="h-16 w-16 rounded object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
                          <SalonFileUpload kind="gallery" label={`Gallery photo ${index + 1} (JPG, PNG, WebP; max 8 MB)`} accept="image/jpeg,image/png,image/webp" previewUrl={image || undefined} onUploaded={(result) => { if (result.url) setForm((current) => ({ ...current, images: current.images.map((item, itemIndex) => itemIndex === index ? result.url || '' : item) })); }} />
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" aria-label={`Move gallery photo ${index + 1} up`} disabled={index === 0} onClick={() => {
                              const images = [...form.images];
                              [images[index - 1], images[index]] = [images[index], images[index - 1]];
                              setForm({ ...form, images });
                            }}>Up</Button>
                            <Button type="button" variant="outline" aria-label={`Move gallery photo ${index + 1} down`} disabled={index === form.images.length - 1} onClick={() => {
                              const images = [...form.images];
                              [images[index + 1], images[index]] = [images[index], images[index + 1]];
                              setForm({ ...form, images });
                            }}>Down</Button>
                            <Button type="button" variant="outline" aria-label={`Remove gallery photo ${index + 1}`} onClick={() => setForm({ ...form, images: form.images.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" disabled={form.images.length >= 20} onClick={() => setForm({ ...form, images: [...form.images, ''] })}>Add gallery photo</Button>
                    </div>
                    <fieldset>
                      <legend className="mb-2 font-medium">Facilities</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SALON_FACILITY_ARRAY.map((facility) => (
                          <label key={facility} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={form.facilities.includes(facility)} onChange={(event) => setForm({ ...form, facilities: event.target.checked ? [...form.facilities, facility] : form.facilities.filter((item) => item !== facility) })} />
                            {facility.replace(/_/g, ' ')}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div>
                      <h3 className="mb-2 font-medium">Opening hours</h3>
                      <div className="space-y-2">
                        {DAYS.map(([day, label]) => (
                          <div key={day} className="grid items-center gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr]">
                            <label className="flex items-center gap-2 font-medium">
                              <input type="checkbox" checked={form.openingHours[day].isOpen} onChange={(event) => setForm({ ...form, openingHours: { ...form.openingHours, [day]: { ...form.openingHours[day], isOpen: event.target.checked } } })} />
                              {label}
                            </label>
                            <Input aria-label={`${label} opening time`} type="time" disabled={!form.openingHours[day].isOpen} required={form.openingHours[day].isOpen} value={form.openingHours[day].openTime} onChange={(event) => setForm({ ...form, openingHours: { ...form.openingHours, [day]: { ...form.openingHours[day], openTime: event.target.value } } })} />
                            <Input aria-label={`${label} closing time`} type="time" disabled={!form.openingHours[day].isOpen} required={form.openingHours[day].isOpen} value={form.openingHours[day].closeTime} onChange={(event) => setForm({ ...form, openingHours: { ...form.openingHours, [day]: { ...form.openingHours[day], closeTime: event.target.value } } })} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" variant="primary" disabled={saving || !form.city || postalLookupStatus === 'loading'}>Review profile</Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
