'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SalonOption { _id: string; name: string; slug: string; address?: { city?: string; country?: string } }
interface ServiceOption { _id: string; name: string; duration: number; price: number }

export default function BarberOnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [city, setCity] = useState('Delhi');
  const [salons, setSalons] = useState<SalonOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [existingSalonId, setExistingSalonId] = useState('');
  const [form, setForm] = useState({ name: '', bio: '', experienceYears: '0', salonName: '', addressLine1: '', area: '', state: 'Delhi', postalCode: '110001', phone: '', latitude: '28.6139', longitude: '77.2090', serviceName: 'Signature Haircut', serviceDuration: '45', servicePrice: '45000' });
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/salons?city=${encodeURIComponent(city)}&limit=50`).then((response) => response.json()).then((result) => setSalons(result.data || [])).catch(() => setError('Unable to load salons'));
  }, [city]);

  useEffect(() => {
    if (!existingSalonId) return;
    fetch(`/api/services?salonId=${existingSalonId}&isActive=true`).then((response) => response.json()).then((result) => setServices(result.data || [])).catch(() => setError('Unable to load salon services'));
  }, [existingSalonId]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggleService = (serviceId: string) => setServiceIds((current) => current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId]);

  async function submit() {
    setSaving(true); setError('');
    const body = mode === 'existing'
      ? { salonMode: mode, existingSalonId, barber: { name: form.name, bio: form.bio || undefined, experienceYears: Number(form.experienceYears), serviceIds } }
      : { salonMode: mode, salon: { name: form.salonName, addressLine1: form.addressLine1, area: form.area || undefined, city, state: form.state, postalCode: form.postalCode, latitude: Number(form.latitude), longitude: Number(form.longitude), phone: form.phone }, newServices: [{ name: form.serviceName, category: 'HAIRCUT', duration: Number(form.serviceDuration), price: Number(form.servicePrice) }], barber: { name: form.name, bio: form.bio || undefined, experienceYears: Number(form.experienceYears), serviceIds: [] } };
    try {
      const response = await fetch('/api/barber/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || 'Unable to submit onboarding');
      router.replace('/dashboard/barber');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to submit onboarding'); } finally { setSaving(false); }
  }

  return <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8"><header><p className="text-sm uppercase tracking-[0.16em] text-brand-pink">Barber onboarding</p><h1 className="mt-2 text-3xl font-bold">Complete your barber profile</h1><p className="mt-2 text-sm text-neutral-600">Your profile and salon remain pending until approved by an admin.</p></header><Card><CardHeader><CardTitle>1. Barber profile</CardTitle></CardHeader><CardContent className="space-y-4"><Input label="Barber name" value={form.name} onChange={(event) => update('name', event.target.value)} required /><Input label="Bio" value={form.bio} onChange={(event) => update('bio', event.target.value)} /><Input label="Experience years" type="number" min="0" value={form.experienceYears} onChange={(event) => update('experienceYears', event.target.value)} required /></CardContent></Card><Card><CardHeader><CardTitle>2. Salon</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Button type="button" variant={mode === 'existing' ? 'primary' : 'secondary'} onClick={() => setMode('existing')}>Join existing salon</Button><Button type="button" variant={mode === 'new' ? 'primary' : 'secondary'} onClick={() => setMode('new')}>Create new salon</Button></div>{mode === 'existing' ? <><label className="block text-sm font-medium">City<select className="mt-1 w-full rounded-lg border border-border p-3" value={city} onChange={(event) => setCity(event.target.value)}><option>Delhi</option><option>Mumbai</option><option>Bengaluru</option><option>Kolkata</option></select></label><label className="block text-sm font-medium">Salon<select className="mt-1 w-full rounded-lg border border-border p-3" value={existingSalonId} onChange={(event) => setExistingSalonId(event.target.value)} required><option value="">Select approved salon</option>{salons.map((salon) => <option key={salon._id} value={salon._id}>{salon.name} - {salon.address?.city}, {salon.address?.country || 'India'}</option>)}</select></label>{services.length > 0 && <div><p className="mb-2 text-sm font-medium">Services you provide</p>{services.map((service) => <label key={service._id} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceIds.includes(service._id)} onChange={() => toggleService(service._id)} />{service.name}</label>)}</div>}</> : <div className="grid gap-4 sm:grid-cols-2"><Input label="Salon name" value={form.salonName} onChange={(event) => update('salonName', event.target.value)} required /><Input label="City" value={city} onChange={(event) => setCity(event.target.value)} required /><Input label="Address" value={form.addressLine1} onChange={(event) => update('addressLine1', event.target.value)} required /><Input label="Area" value={form.area} onChange={(event) => update('area', event.target.value)} /><Input label="State" value={form.state} onChange={(event) => update('state', event.target.value)} required /><Input label="Postal code" value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} required /><Input label="Salon phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} required /><Input label="Latitude" type="number" value={form.latitude} onChange={(event) => update('latitude', event.target.value)} required /><Input label="Longitude" type="number" value={form.longitude} onChange={(event) => update('longitude', event.target.value)} required /><Input label="First service" value={form.serviceName} onChange={(event) => update('serviceName', event.target.value)} required /><Input label="Duration (minutes)" type="number" value={form.serviceDuration} onChange={(event) => update('serviceDuration', event.target.value)} required /><Input label="Price (paise)" type="number" value={form.servicePrice} onChange={(event) => update('servicePrice', event.target.value)} required /></div>}</CardContent></Card>{error && <p className="text-sm text-red-700">{error}</p>}<Button fullWidth onClick={submit} disabled={saving}>{saving ? 'Submitting for approval...' : 'Submit onboarding'}</Button></main>;
}
