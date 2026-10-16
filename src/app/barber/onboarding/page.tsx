'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import SupportedCitySelect from '@/components/location/SupportedCitySelect';

interface SalonOption {
  _id: string;
  name: string;
  slug: string;
  logo?: string | null;
  coverImage?: string | null;
  address?: { area?: string; city?: string; state?: string };
}

interface ServiceOption {
  _id: string;
  name: string;
  duration: number;
  price: number;
}

type OnboardingStep = 1 | 2 | 3;

export default function BarberOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [city, setCity] = useState('');
  const [salons, setSalons] = useState<SalonOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [existingSalonId, setExistingSalonId] = useState('');
  const [form, setForm] = useState({
    name: '',
    bio: '',
    experienceYears: '0',
  });
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [salonsLoading, setSalonsLoading] = useState(false);
  const [salonsError, setSalonsError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [retrySalons, setRetrySalons] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;

    const loadSalons = async () => {
      setSalonsLoading(true);
      setSalonsError(null);
      try {
        const response = await fetch(`/api/salons?city=${encodeURIComponent(city)}&isVerified=true&limit=50`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || `Salon search failed (${response.status})`);
        }
        if (!cancelled) setSalons(Array.isArray(result.data) ? result.data : []);
      } catch (reason) {
        if (!cancelled) {
          setSalons([]);
          setSalonsError(reason instanceof Error ? reason.message : 'Unable to load approved salons.');
        }
      } finally {
        if (!cancelled) setSalonsLoading(false);
      }
    };

    void loadSalons();
    return () => {
      cancelled = true;
    };
  }, [city, retrySalons]);

  useEffect(() => {
    if (!existingSalonId) return;
    let cancelled = false;

    const loadServices = async () => {
      setServicesLoading(true);
      setServicesError(null);
      try {
        const response = await fetch(`/api/services?salonId=${encodeURIComponent(existingSalonId)}&isActive=true`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || `Service search failed (${response.status})`);
        }
        const availableServices = Array.isArray(result.data) ? result.data : [];
        if (!cancelled) {
          setServices(availableServices);
          const availableServiceIds = new Set<string>(availableServices.map((service: ServiceOption) => service._id));
          setServiceIds((current) => current.filter((serviceId) => availableServiceIds.has(serviceId)));
        }
      } catch (reason) {
        if (!cancelled) {
          setServices([]);
          setServicesError(reason instanceof Error ? reason.message : 'Unable to load salon services.');
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    };

    void loadServices();
    return () => {
      cancelled = true;
    };
  }, [existingSalonId]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleService = (serviceId: string) => {
    setServiceIds((current) => current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]);
  };

  const selectedSalon = salons.find((salon) => salon._id === existingSalonId);

  function continueToSalonChoice() {
    setError('');
    if (form.name.trim().length < 2) {
      setError('Enter a barber name with at least 2 characters.');
      return;
    }
    const experienceYears = Number(form.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setError('Experience must be a whole number between 0 and 60 years.');
      return;
    }
    setStep(2);
  }

  function continueToReview() {
    setError('');
    if (salonsLoading) {
      setError('Wait for the salon directory to finish loading.');
      return;
    }
    if (salonsError) {
      setError('Salon search is unavailable. Retry the search before continuing.');
      return;
    }
    if (!city || !existingSalonId) {
      setError('Select an approved salon to continue.');
      return;
    }
    if (servicesLoading || servicesError) {
      setError(servicesError || 'Wait for salon services to finish loading.');
      return;
    }
    if (serviceIds.length === 0) {
      setError('Select at least one service you provide at this salon.');
      return;
    }
    setStep(3);
  }

  async function submit() {
    setSaving(true);
    setError('');
    const body = {
      salonMode: 'existing',
      existingSalonId,
      barber: {
        name: form.name.trim(),
        bio: form.bio.trim() || undefined,
        experienceYears: Number(form.experienceYears),
        serviceIds,
      },
    };

    try {
      const response = await fetch('/api/barber/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Unable to submit onboarding.');
      }
      router.replace('/dashboard/barber');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit onboarding.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header>
        <p className="text-sm uppercase tracking-[0.16em] text-brand-pink">Barber onboarding</p>
        <h1 className="mt-2 text-3xl font-bold">Complete your barber profile</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Barber staff join an existing approved salon. If you own the business, <Link className="font-semibold text-brand-pink" href="/salon/signup">register as a Salon Owner</Link>.
        </p>
      </header>

      <ol className="grid grid-cols-3 gap-2 text-sm">
        {['Barber profile', 'Salon relationship', 'Review'].map((label, index) => (
          <li key={label} className={`rounded-lg p-3 ${step === index + 1 ? 'bg-brand-pink text-white' : 'bg-neutral-100 text-neutral-600'}`}>
            <span className="font-semibold">{index + 1}. </span>{label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Barber profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Barber name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
            <Input label="Bio" value={form.bio} onChange={(event) => update('bio', event.target.value)} />
            <Input label="Experience years" type="number" min="0" max="60" value={form.experienceYears} onChange={(event) => update('experienceYears', event.target.value)} required />
            <div className="flex justify-end">
              <Button type="button" onClick={continueToSalonChoice}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>2. Choose your salon relationship</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-4">
                <SupportedCitySelect value={city} label="Salon city" required onChange={(location) => { setCity(location.city); setExistingSalonId(''); setServiceIds([]); setServices([]); setServicesError(null); }} />
                {salonsLoading ? (
                  <p role="status" className="text-sm text-neutral-600">Loading approved salons in {city}…</p>
                ) : salonsError ? (
                  <div role="alert" className="space-y-3 rounded-xl border border-error-200 bg-error-50 p-4">
                    <div className="flex items-start gap-2 text-error-700">
                      <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Salon directory unavailable</p>
                        <p className="text-sm">{salonsError}</p>
                        <p className="mt-1 text-sm">If this continues, ask the project administrator to check the configured database connection.</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setRetrySalons((value) => value + 1)}>
                      <RefreshCw size={14} className="mr-2" />Retry salon search
                    </Button>
                  </div>
                ) : salons.length === 0 ? (
                  <p className="rounded-xl border border-neutral-200 p-4 text-sm text-neutral-600">
                    {city ? `No approved salons were found in ${city}. Try another supported city or ask the salon owner to complete approval.` : 'Choose a supported launch city to search approved salons.'}
                  </p>
                ) : (
                  <label className="block text-sm font-medium">
                    Approved salon
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-white p-3"
                      value={existingSalonId}
                      onChange={(event) => { setExistingSalonId(event.target.value); setServiceIds([]); setServices([]); setServicesError(null); }}
                      required
                    >
                      <option value="">Select approved salon</option>
                      {salons.map((salon) => (
                        <option key={salon._id} value={salon._id}>
                          {salon.name} — {[salon.address?.area, salon.address?.city, salon.address?.state].filter(Boolean).join(', ')}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {existingSalonId && (
                  <div>
                    {servicesLoading ? <p role="status" className="text-sm text-neutral-600">Loading salon services…</p> : null}
                    {servicesError ? <p role="alert" className="text-sm text-error-700">{servicesError}</p> : null}
                    {!servicesLoading && !servicesError && services.length === 0 ? (
                      <p className="text-sm text-neutral-600">This salon has no active services available to select.</p>
                    ) : null}
                    {services.length > 0 ? (
                      <fieldset className="space-y-2">
                        <legend className="mb-2 text-sm font-medium">Services you provide</legend>
                        {services.map((service) => (
                          <label key={service._id} className="mr-4 inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={serviceIds.includes(service._id)} onChange={() => toggleService(service._id)} />
                            {service.name} · {service.duration} min · ₹{(service.price / 100).toFixed(0)}
                          </label>
                        ))}
                      </fieldset>
                    ) : null}
                  </div>
                )}
            </div>

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => { setError(''); setStep(1); }}>Back</Button>
              <Button type="button" onClick={continueToReview}>Review details</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>3. Review and submit</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <section className="rounded-xl bg-neutral-50 p-4">
              <h2 className="font-semibold">Barber profile</h2>
              <p className="mt-2 text-sm">{form.name} · {form.experienceYears} years experience</p>
              {form.bio ? <p className="mt-1 text-sm text-neutral-600">{form.bio}</p> : null}
            </section>
            <section className="rounded-xl bg-neutral-50 p-4">
              <h2 className="font-semibold">Salon</h2>
              <p className="mt-2 text-sm">{selectedSalon?.name || 'Selected salon'} — {[selectedSalon?.address?.area, selectedSalon?.address?.city, selectedSalon?.address?.state].filter(Boolean).join(', ')}</p>
              <p className="mt-1 text-sm text-neutral-600">Services: {services.filter((service) => serviceIds.includes(service._id)).map((service) => service.name).join(', ')}</p>
              <p className="mt-2 text-sm text-amber-700">Your barber profile remains unpublished until administrator approval. Salon ownership and business registration are handled separately.</p>
            </section>
            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => { setError(''); setStep(2); }}>Back to edit</Button>
              <Button type="button" onClick={() => void submit()} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit for review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
          <AlertCircle size={16} />{error}
        </p>
      )}
      {step === 3 && !error ? (
        <p className="flex items-center gap-2 text-sm text-neutral-600">
          <CheckCircle2 size={16} />Submission does not publish a salon or grant admin approval.
        </p>
      ) : null}
    </main>
  );
}
