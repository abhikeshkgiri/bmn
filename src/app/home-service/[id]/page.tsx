'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface HomeBooking {
  _id: string;
  homeServiceStatus?: string;
  appointmentDate: string;
  startTime: string;
  service?: { name?: string };
  barber?: { name?: string };
  customerAddress?: { addressLine1?: string; area?: string; city?: string };
  latestBarberLocation?: { latitude: number; longitude: number; updatedAt: string };
}

const steps = ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'SERVICE_STARTED', 'SERVICE_COMPLETED'];

export default function HomeServiceTrackingPage() {
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<HomeBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch(`/api/home-service/requests/${params.id}`);
      const result = await response.json();
      if (!active) return;
      if (!response.ok || !result.success) setError(result.error?.message || 'Unable to load tracking');
      else setBooking(result.data);
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [params.id]);

  if (error) return <main className="mx-auto max-w-2xl p-6"><Card className="p-8 text-center"><p className="text-red-700">{error}</p><Link href="/dashboard"><Button className="mt-5">Back to dashboard</Button></Link></Card></main>;
  if (!booking) return <main className="mx-auto max-w-2xl p-6"><Card className="p-8">Loading home-service tracking...</Card></main>;

  const currentIndex = steps.indexOf(booking.homeServiceStatus || 'REQUESTED');
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header><p className="text-sm uppercase tracking-[0.16em] text-brand-pink">Home service</p><h1 className="mt-2 text-3xl font-bold">Track your barber</h1></header>
      <Card><CardHeader><div className="flex items-center justify-between gap-4"><CardTitle>{booking.service?.name || 'Grooming service'}</CardTitle><Badge variant="info">{booking.homeServiceStatus || 'REQUESTED'}</Badge></div></CardHeader><CardContent className="space-y-4"><p className="text-foreground-secondary">Barber: <span className="font-medium text-foreground">{booking.barber?.name || 'Assigned barber'}</span></p><p className="text-foreground-secondary">{new Date(booking.appointmentDate).toLocaleDateString()} at {booking.startTime}</p><p className="text-foreground-secondary">{booking.customerAddress?.addressLine1}, {booking.customerAddress?.area}, {booking.customerAddress?.city}</p>{booking.latestBarberLocation && <div className="rounded-lg bg-neutral-100 p-4 text-sm">Latest barber location: {booking.latestBarberLocation.latitude.toFixed(5)}, {booking.latestBarberLocation.longitude.toFixed(5)}</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Status timeline</CardTitle></CardHeader><CardContent><ol className="space-y-4">{steps.map((step, index) => <li key={step} className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${index <= currentIndex ? 'bg-brand-pink' : 'bg-neutral-300'}`} /><span className={index <= currentIndex ? 'font-medium' : 'text-neutral-500'}>{step.replaceAll('_', ' ')}</span></li>)}</ol></CardContent></Card>
    </main>
  );
}
