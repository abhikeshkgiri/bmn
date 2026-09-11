'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Address { _id: string; label: string; addressLine1: string; city: string; latitude?: number; longitude?: number }

export default function HomeServiceBookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/addresses').then((response) => response.json()).then((result) => setAddresses(result.data || [])).catch(() => setError('Unable to load saved addresses'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null);
    const response = await fetch('/api/home-service/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salonId: params.get('salonId'), barberId: params.get('barberId'), serviceId: params.get('serviceId'), addressId, appointmentDate: new Date(`${date}T00:00:00.000Z`).toISOString(), startTime: time }) });
    const result = await response.json();
    if (!response.ok || !result.success) setError(result.error?.message || 'Unable to create request');
    else router.push(`/home-service/${result.data._id}`);
    setSubmitting(false);
  }

  return <main className="mx-auto max-w-xl p-4 md:p-8"><Card><CardHeader><CardTitle>Book a barber at home</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><label className="block text-sm font-medium">Saved address<select className="mt-1 w-full rounded-lg border border-border p-3" value={addressId} onChange={(event) => setAddressId(event.target.value)} required><option value="">Select an address</option>{addresses.map((address) => <option key={address._id} value={address._id}>{address.label}: {address.addressLine1}, {address.city}</option>)}</select></label><label className="block text-sm font-medium">Date<input className="mt-1 w-full rounded-lg border border-border p-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label className="block text-sm font-medium">Start time<input className="mt-1 w-full rounded-lg border border-border p-3" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>{error && <p className="text-sm text-red-700">{error}</p>}<Button type="submit" fullWidth disabled={submitting}>{submitting ? 'Requesting...' : 'Request home service'}</Button></form></CardContent></Card></main>;
}
