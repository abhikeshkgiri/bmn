'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Request { _id: string; homeServiceStatus?: string; appointmentDate: string; startTime: string; customerAddress?: { city?: string; area?: string }; service?: { name?: string } }

export default function BarberHomeServicePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [message, setMessage] = useState('Loading requests...');
  const load = async () => {
    const response = await fetch('/api/home-service/requests');
    const result = await response.json();
    if (!response.ok || !result.success) setMessage(result.error?.message || 'Unable to load requests');
    else { setRequests(result.data || []); setMessage(''); }
  };
  useEffect(() => {
    fetch('/api/home-service/requests')
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!response.ok || !result.success) setMessage(result.error?.message || 'Unable to load requests');
        else { setRequests(result.data || []); setMessage(''); }
      })
      .catch(() => setMessage('Unable to load requests'));
  }, []);
  const transition = async (id: string, action: 'accept' | 'reject') => { await fetch(`/api/home-service/requests/${id}/${action}`, { method: 'POST' }); await load(); };
  return <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8"><header><p className="text-sm uppercase tracking-[0.16em] text-brand-pink">Barber operations</p><h1 className="mt-2 text-3xl font-bold">Home-service requests</h1></header>{message && <Card className="p-6 text-sm text-neutral-600">{message}</Card>}<div className="space-y-4">{requests.map((request) => <Card key={request._id}><CardHeader><CardTitle>{request.service?.name || 'Service'} <span className="text-sm font-normal text-neutral-500">{request.homeServiceStatus}</span></CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4"><div className="text-sm text-neutral-600">{new Date(request.appointmentDate).toLocaleDateString()} at {request.startTime}<br />{request.customerAddress?.area}, {request.customerAddress?.city}</div><div className="flex gap-2">{request.homeServiceStatus === 'REQUESTED' && <><Button onClick={() => transition(request._id, 'accept')}>Accept</Button><Button variant="secondary" onClick={() => transition(request._id, 'reject')}>Reject</Button></>}{request.homeServiceStatus !== 'REQUESTED' && <Link href={`/home-service/${request._id}`}><Button variant="secondary">Open job</Button></Link>}</div></CardContent></Card>)}</div></main>;
}
