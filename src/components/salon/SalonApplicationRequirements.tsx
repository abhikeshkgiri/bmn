'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BARBER_SPECIALIZATION_ARRAY, SERVICE_CATEGORY_ARRAY } from '@/constants/services';

interface ExistingService {
  _id: string;
  name: string;
  isActive: boolean;
}

interface ExistingBarber {
  _id: string;
  name: string;
  isActive: boolean;
}

interface SalonApplicationRequirementsProps {
  salonId: string;
  services: ExistingService[];
  barbers: ExistingBarber[];
  activeServiceCount: number;
  barberProfileCount: number;
  onSaved: () => Promise<void>;
}

export default function SalonApplicationRequirements({
  salonId,
  services,
  barbers,
  activeServiceCount,
  barberProfileCount,
  onSaved,
}: SalonApplicationRequirementsProps) {
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [servicePrice, setServicePrice] = useState('');
  const [barberName, setBarberName] = useState('');
  const [barberTitle, setBarberTitle] = useState('');
  const [barberExperience, setBarberExperience] = useState('0');
  const [barberServices, setBarberServices] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [savingService, setSavingService] = useState(false);
  const [savingBarber, setSavingBarber] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const saveService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingService) return;
    setSavingService(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          name: serviceName,
          category: serviceCategory,
          duration: Number(serviceDuration),
          price: Math.round(Number(servicePrice) * 100),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const details = result?.error?.details
          ?.map((issue: { path?: (string | number)[]; message?: string }) =>
            `${issue.path?.join('.') || 'Service'}: ${issue.message || 'Invalid value'}`
          )
          .join('; ');
        throw new Error(details || result?.error?.message || 'Unable to save the service.');
      }
      setServiceName('');
      setServiceCategory('');
      setServiceDuration('30');
      setServicePrice('');
      setNotice('Service saved and active.');
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the service.');
    } finally {
      setSavingService(false);
    }
  };

  const saveBarber = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingBarber) return;
    setSavingBarber(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          name: barberName,
          title: barberTitle,
          experienceYears: Number(barberExperience),
          specializations,
          services: barberServices,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const details = result?.error?.details
          ?.map((issue: { path?: (string | number)[]; message?: string }) =>
            `${issue.path?.join('.') || 'Barber'}: ${issue.message || 'Invalid value'}`
          )
          .join('; ');
        throw new Error(details || result?.error?.message || 'Unable to save the barber profile.');
      }
      setBarberName('');
      setBarberTitle('');
      setBarberExperience('0');
      setBarberServices([]);
      setSpecializations([]);
      setNotice('Barber profile saved. It will be available for bookings after this salon is approved and the profile is active.');
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the barber profile.');
    } finally {
      setSavingBarber(false);
    }
  };

  const availableServices = services.filter((service) => service.isActive);

  return (
    <section className="space-y-3 border-t border-border pt-5" aria-labelledby="application-requirements-title">
      <div>
        <h3 id="application-requirements-title" className="font-semibold">Services and barber team</h3>
        <p className="mt-1 text-sm text-foreground-secondary">
          Save at least one service, then add a barber and tick the services they offer. These are part of your salon application; the barber does not need a separate account.
        </p>
        <p className="mt-2 text-sm font-medium" aria-live="polite">
          Saved services: {activeServiceCount} active · barber profiles: {barberProfileCount}
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      <details open={activeServiceCount === 0} className="rounded-xl border border-border bg-white">
        <summary className="cursor-pointer p-4 font-semibold">1. Add a service {activeServiceCount > 0 ? `(${activeServiceCount} active saved)` : '(required)'}</summary>
        <form onSubmit={saveService} className="space-y-4 border-t border-border p-4">
          <Input label="Service name" required minLength={2} maxLength={100} value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="e.g. Men's haircut" />
          <label className="block text-sm font-medium">
            Category
            <select required value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-white p-3">
              <option value="">Choose a category</option>
              {SERVICE_CATEGORY_ARRAY.map((category) => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Duration (minutes)" type="number" required min={15} max={480} step={5} value={serviceDuration} onChange={(event) => setServiceDuration(event.target.value)} />
            <Input label="Price (₹)" type="number" required min={1} step="0.01" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} />
          </div>
          <Button type="submit" variant="primary" disabled={savingService}>{savingService ? 'Saving service…' : 'Save service'}</Button>
        </form>
      </details>

      <details open={barberProfileCount === 0 && activeServiceCount > 0} className="rounded-xl border border-border bg-white">
        <summary className="cursor-pointer p-4 font-semibold">2. Add a barber and assign services {barberProfileCount > 0 ? `(${barberProfileCount} saved)` : '(required)'}</summary>
        <form onSubmit={saveBarber} className="space-y-4 border-t border-border p-4">
          {barbers.length > 0 && (
            <ul className="space-y-1 text-sm text-foreground-secondary">
              {barbers.map((barber) => <li key={barber._id}>{barber.name} · {barber.isActive ? 'Active' : 'Inactive'}</li>)}
            </ul>
          )}
          <Input label="Barber name" required minLength={2} maxLength={100} value={barberName} onChange={(event) => setBarberName(event.target.value)} placeholder="e.g. Rahul Kumar" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Title / role (optional)" maxLength={100} value={barberTitle} onChange={(event) => setBarberTitle(event.target.value)} placeholder="e.g. Senior Barber" />
            <Input label="Years of experience" type="number" required min={0} max={60} value={barberExperience} onChange={(event) => setBarberExperience(event.target.value)} />
          </div>
          {availableServices.length === 0 ? (
            <p className="text-sm text-amber-800">Save an active service first, then assign it to this barber.</p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Services this barber offers (choose at least one)</legend>
              {availableServices.map((service) => (
                <label key={service._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={barberServices.includes(service._id)} onChange={(event) => setBarberServices((current) => event.target.checked ? [...current, service._id] : current.filter((id) => id !== service._id))} />
                  {service.name}
                </label>
              ))}
              {barberServices.length === 0 && <p className="text-xs text-amber-800">Select a service before saving the barber.</p>}
            </fieldset>
          )}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Specializations (optional)</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BARBER_SPECIALIZATION_ARRAY.map((specialization) => (
                <label key={specialization} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={specializations.includes(specialization)} onChange={(event) => setSpecializations((current) => event.target.checked ? [...current, specialization] : current.filter((value) => value !== specialization))} />
                  {specialization.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" variant="primary" disabled={savingBarber || availableServices.length === 0 || barberServices.length === 0}>
            {savingBarber ? 'Saving barber…' : 'Save barber profile'}
          </Button>
        </form>
      </details>
    </section>
  );
}
